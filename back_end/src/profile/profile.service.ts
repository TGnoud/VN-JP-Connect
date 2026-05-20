import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Match,
  MatchDocument,
  Profile,
  ProfileDocument,
  Tag,
  TagDocument,
  User,
  UserDocument,
  UserInterest,
  UserInterestDocument,
} from '../database/schemas';
import { calculateAge, DEFAULT_LEGACY_AGE } from '../common/age';
import {
  MAX_BIO_LENGTH,
  MAX_PROFILE_PHOTOS,
  PROFILE_GENDER_OPTIONS,
  PROFILE_LANGUAGE_LEVEL_OPTIONS,
  PROFILE_LANGUAGE_OPTIONS,
  PROFILE_LOCATION_OPTIONS,
  PROFILE_NATIONALITY_OPTIONS,
} from './profile.constants';
import { LanguageInput, PersonalProfileInput } from './profile.validation';
import {
  ProfileImageStorageService,
  UploadedFileLike,
} from './profile-image-storage.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    @InjectModel(UserInterest.name)
    private readonly userInterestModel: Model<UserInterestDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    private readonly profileImageStorage: ProfileImageStorageService,
  ) {}

  getProfileOptions() {
    return {
      genders: PROFILE_GENDER_OPTIONS,
      nationalities: PROFILE_NATIONALITY_OPTIONS,
      locations: PROFILE_LOCATION_OPTIONS,
      languages: PROFILE_LANGUAGE_OPTIONS,
      languageLevels: PROFILE_LANGUAGE_LEVEL_OPTIONS,
    };
  }

  async searchTags(type?: string, q?: string) {
    const filter: Record<string, unknown> = {};

    if (type) {
      if (!['interest', 'purpose'].includes(type)) {
        throw new BadRequestException('type must be interest or purpose');
      }

      filter.type = type;
    }

    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }

    const tags = await this.tagModel.find(filter).sort({ name: 1 }).lean().exec();
    return tags.map((tag) => ({
      id: tag._id.toString(),
      name: tag.name,
      type: tag.type,
    }));
  }

  async getMe(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const [user, profile] = await Promise.all([
      this.getUser(userObjectId),
      this.ensureProfile(userObjectId),
    ]);
    const [interests, connectionsCount] = await Promise.all([
      this.getInterestTags(userObjectId),
      this.countConnections(userObjectId),
    ]);

    return this.toProfileResponse(user, profile, interests, connectionsCount);
  }

  async updatePersonal(userId: string, input: PersonalProfileInput) {
    const userObjectId = new Types.ObjectId(userId);
    const userSet: Record<string, unknown> = {};
    const profileSet: Record<string, unknown> = { updated_at: new Date() };

    if (input.email) {
      const existing = await this.userModel
        .findOne({ email: input.email, _id: { $ne: userObjectId } })
        .lean()
        .exec();

      if (existing) {
        throw new ConflictException('email is already in use');
      }

      userSet.email = input.email;
    }

    if (input.fullName) {
      userSet.full_name = input.fullName;
    }

    if (input.nationality) {
      userSet.nationality = input.nationality;
    }

    if (input.gender) {
      profileSet.gender = input.gender;
    }

    for (const field of ['location', 'occupation', 'education'] as const) {
      if (input[field] !== undefined) {
        profileSet[field] = input[field];
      }
    }

    if (input.socialLinks) {
      for (const field of ['instagram', 'facebook', 'line'] as const) {
        if (input.socialLinks[field] !== undefined) {
          profileSet[`social_links.${field}`] = input.socialLinks[field];
        }
      }
    }

    if (Object.keys(userSet).length > 0) {
      await this.userModel.updateOne({ _id: userObjectId }, { $set: userSet }).exec();
    }

    await this.profileModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        { $set: profileSet, $setOnInsert: { user_id: userObjectId } },
        { returnDocument: 'after', upsert: true },
      )
      .exec();

    return this.getMe(userId);
  }

  async updateBio(userId: string, bio: string) {
    if (bio.length > MAX_BIO_LENGTH) {
      throw new BadRequestException(`bio must be at most ${MAX_BIO_LENGTH} characters`);
    }

    const userObjectId = new Types.ObjectId(userId);
    await this.profileModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: { bio, updated_at: new Date() },
          $setOnInsert: { user_id: userObjectId },
        },
        { returnDocument: 'after', upsert: true, runValidators: true },
      )
      .exec();

    return this.getMe(userId);
  }

  async replaceLanguages(userId: string, languages: LanguageInput[]) {
    const userObjectId = new Types.ObjectId(userId);
    await this.profileModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: { languages, updated_at: new Date() },
          $setOnInsert: { user_id: userObjectId },
        },
        { returnDocument: 'after', upsert: true },
      )
      .exec();

    return this.getMe(userId);
  }

  async replaceInterests(userId: string, tagIds: string[]) {
    const userObjectId = new Types.ObjectId(userId);
    const objectIds = tagIds.map((tagId) => new Types.ObjectId(tagId));

    if (objectIds.length > 0) {
      const foundCount = await this.tagModel
        .countDocuments({ _id: { $in: objectIds }, type: 'interest' })
        .exec();

      if (foundCount !== objectIds.length) {
        throw new BadRequestException('all tagIds must reference existing interest tags');
      }
    }

    await this.userInterestModel.deleteMany({ user_id: userObjectId }).exec();

    if (objectIds.length > 0) {
      await this.userInterestModel.insertMany(
        objectIds.map((tagId) => ({ user_id: userObjectId, tag_id: tagId })),
        { ordered: false },
      );
    }

    return this.getMe(userId);
  }

  async addPhotos(userId: string, files: UploadedFileLike[]) {
    if (!files?.length) {
      throw new BadRequestException('at least one photo file is required');
    }

    const userObjectId = new Types.ObjectId(userId);
    const profile = await this.ensureProfile(userObjectId);
    const existingPhotos = profile.photos ?? [];

    if (existingPhotos.length + files.length > MAX_PROFILE_PHOTOS) {
      throw new BadRequestException(`photos cannot exceed ${MAX_PROFILE_PHOTOS}`);
    }

    const savedPhotos = await Promise.all(
      files.map(async (file, index) => {
        const storedImage = await this.profileImageStorage.saveProfileImage(
          userId,
          file,
          'photo',
        );

        return {
          _id: new Types.ObjectId(),
          url: storedImage.url,
          public_id: storedImage.publicId ?? '',
          is_main: existingPhotos.length === 0 && index === 0,
          uploaded_at: new Date(),
        };
      }),
    );

    await this.profileModel
      .updateOne(
        { user_id: userObjectId },
        {
          $push: { photos: { $each: savedPhotos } },
          $set: { updated_at: new Date() },
        },
      )
      .exec();

    return this.getMe(userId);
  }

  async addPhotoUrls(userId: string, urls: string[]) {
    if (urls.length === 0) {
      throw new BadRequestException('at least one photo URL is required');
    }

    const userObjectId = new Types.ObjectId(userId);
    const profile = await this.ensureProfile(userObjectId);
    const existingPhotos = profile.photos ?? [];

    if (existingPhotos.length + urls.length > MAX_PROFILE_PHOTOS) {
      throw new BadRequestException(`photos cannot exceed ${MAX_PROFILE_PHOTOS}`);
    }

    const savedPhotos = urls.map((url, index) => ({
      _id: new Types.ObjectId(),
      url,
      is_main: existingPhotos.length === 0 && index === 0,
      uploaded_at: new Date(),
    }));

    await this.profileModel
      .updateOne(
        { user_id: userObjectId },
        {
          $push: { photos: { $each: savedPhotos } },
          $set: { updated_at: new Date() },
        },
      )
      .exec();

    return this.getMe(userId);
  }

  async deletePhoto(userId: string, photoId: string) {
    if (!Types.ObjectId.isValid(photoId)) {
      throw new BadRequestException('photoId must be a valid ObjectId');
    }

    const userObjectId = new Types.ObjectId(userId);
    const profile = await this.ensureProfile(userObjectId);
    const photo = (profile.photos ?? []).find((item) => item._id.toString() === photoId);

    if (!photo) {
      throw new NotFoundException('photo was not found');
    }

    await this.profileModel
      .updateOne(
        { user_id: userObjectId },
        {
          $pull: { photos: { _id: new Types.ObjectId(photoId) } },
          $set: { updated_at: new Date() },
        },
      )
      .exec();
    await this.profileImageStorage.deleteProfileImage(photo.url, photo.public_id);

    return this.getMe(userId);
  }

  async updateAvatar(userId: string, file: UploadedFileLike) {
    const storedImage = await this.profileImageStorage.saveProfileImage(userId, file, 'avatar');
    return this.updateAvatarUrl(userId, storedImage.url);
  }

  async updateAvatarUrl(userId: string, url: string) {
    const userObjectId = new Types.ObjectId(userId);
    await this.profileModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: { avatar_url: url, updated_at: new Date() },
          $setOnInsert: { user_id: userObjectId },
        },
        { returnDocument: 'after', upsert: true },
      )
      .exec();

    return this.getMe(userId);
  }

  async updateCover(userId: string, file: UploadedFileLike) {
    const storedImage = await this.profileImageStorage.saveProfileImage(userId, file, 'cover');
    return this.updateCoverUrl(userId, storedImage.url);
  }

  async updateCoverUrl(userId: string, url: string) {
    const userObjectId = new Types.ObjectId(userId);
    await this.profileModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: { cover_url: url, updated_at: new Date() },
          $setOnInsert: { user_id: userObjectId },
        },
        { returnDocument: 'after', upsert: true },
      )
      .exec();

    return this.getMe(userId);
  }

  private async getUser(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId).lean().exec();

    if (!user) {
      throw new NotFoundException('user was not found');
    }

    return user;
  }

  private async ensureProfile(userId: Types.ObjectId) {
    const existing = await this.profileModel.findOne({ user_id: userId }).lean().exec();

    if (existing) {
      return existing;
    }

    try {
      return await this.profileModel
        .create({
          user_id: userId,
          location: '',
          occupation: '',
          education: '',
          bio: '',
          avatar_url: '',
          cover_url: '',
          social_links: { instagram: '', facebook: '', line: '' },
          languages: [],
          photos: [],
          updated_at: new Date(),
        })
        .then((profile) => profile.toObject());
    } catch {
      const createdByOtherRequest = await this.profileModel
        .findOne({ user_id: userId })
        .lean()
        .exec();

      if (!createdByOtherRequest) {
        throw new BadRequestException('profile could not be created');
      }

      return createdByOtherRequest;
    }
  }

  private async getInterestTags(userId: Types.ObjectId) {
    const interestLinks = await this.userInterestModel.find({ user_id: userId }).lean().exec();
    const tagIds = interestLinks.map((item) => item.tag_id);

    if (tagIds.length === 0) {
      return [];
    }

    const tags = await this.tagModel
      .find({ _id: { $in: tagIds }, type: 'interest' })
      .lean()
      .exec();
    return tags.map((tag) => ({
      id: tag._id.toString(),
      name: tag.name,
      type: tag.type,
    }));
  }

  private countConnections(userId: Types.ObjectId) {
    return this.matchModel
      .countDocuments({
        status: 'accepted',
        $or: [{ requester_id: userId }, { receiver_id: userId }],
      })
      .exec();
  }

  private toProfileResponse(
    user: Record<string, any>,
    profile: Record<string, any>,
    interests: Array<{ id: string; name: string; type: string }>,
    connectionsCount: number,
  ) {
    return {
      id: user._id.toString(),
      fullName: user.full_name,
      email: user.email,
      phoneNumber: user.phone_number,
      nationality: user.nationality,
      age: calculateAge(user.birth_date) ?? profile.age ?? DEFAULT_LEGACY_AGE,
      gender: profile.gender ?? null,
      location: profile.location ?? '',
      occupation: profile.occupation ?? '',
      education: profile.education ?? '',
      bio: String(profile.bio ?? '').slice(0, MAX_BIO_LENGTH),
      avatarUrl: profile.avatar_url ?? '',
      coverUrl: profile.cover_url ?? '',
      socialLinks: {
        instagram: profile.social_links?.instagram ?? '',
        facebook: profile.social_links?.facebook ?? '',
        line: profile.social_links?.line ?? '',
      },
      languages: (profile.languages ?? []).map((item) => ({
        language: item.language,
        level: item.level,
      })),
      interests,
      photos: (profile.photos ?? []).map((photo) => ({
        id: photo._id.toString(),
        url: photo.url,
        isMain: photo.is_main,
        uploadedAt: photo.uploaded_at,
      })),
      likeRate: profile.match_rate ?? 100,
      connectionsCount: profile.connections_count ?? connectionsCount,
      joinedAt: user.created_at,
      updatedAt: profile.updated_at,
    };
  }

}
