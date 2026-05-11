import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { Model, Types } from 'mongoose';
import { join } from 'path';
import { randomUUID } from 'crypto';
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
import {
  MAX_PROFILE_PHOTOS,
  PROFILE_GENDER_OPTIONS,
  PROFILE_LANGUAGE_LEVEL_OPTIONS,
  PROFILE_LANGUAGE_OPTIONS,
  PROFILE_LOCATION_OPTIONS,
  PROFILE_NATIONALITY_OPTIONS,
} from './profile.constants';
import { LanguageInput, PersonalProfileInput } from './profile.validation';

interface UploadedFileLike {
  buffer?: Buffer;
  mimetype: string;
  originalname?: string;
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    @InjectModel(UserInterest.name)
    private readonly userInterestModel: Model<UserInterestDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
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

    if (input.age !== undefined) {
      profileSet.age = input.age;
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
        { new: true, upsert: true },
      )
      .exec();

    return this.getMe(userId);
  }

  async updateBio(userId: string, bio: string) {
    const userObjectId = new Types.ObjectId(userId);
    await this.profileModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: { bio, updated_at: new Date() },
          $setOnInsert: { user_id: userObjectId },
        },
        { new: true, upsert: true },
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
        { new: true, upsert: true },
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
      files.map(async (file, index) => ({
        _id: new Types.ObjectId(),
        url: await this.saveUploadedFile(userId, file),
        is_main: existingPhotos.length === 0 && index === 0,
        uploaded_at: new Date(),
      })),
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
    await this.deleteLocalFile(photo.url);

    return this.getMe(userId);
  }

  async updateAvatar(userId: string, file: UploadedFileLike) {
    const userObjectId = new Types.ObjectId(userId);
    const url = await this.saveUploadedFile(userId, file);
    await this.profileModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: { avatar_url: url, updated_at: new Date() },
          $setOnInsert: { user_id: userObjectId },
        },
        { new: true, upsert: true },
      )
      .exec();

    return this.getMe(userId);
  }

  async updateCover(userId: string, file: UploadedFileLike) {
    const userObjectId = new Types.ObjectId(userId);
    const url = await this.saveUploadedFile(userId, file);
    await this.profileModel
      .findOneAndUpdate(
        { user_id: userObjectId },
        {
          $set: { cover_url: url, updated_at: new Date() },
          $setOnInsert: { user_id: userObjectId },
        },
        { new: true, upsert: true },
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
      age: profile.age ?? null,
      gender: profile.gender ?? null,
      location: profile.location ?? '',
      occupation: profile.occupation ?? '',
      education: profile.education ?? '',
      bio: profile.bio ?? '',
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
      likeRate: 100,
      connectionsCount,
      joinedAt: user.created_at,
      updatedAt: profile.updated_at,
    };
  }

  private async saveUploadedFile(userId: string, file: UploadedFileLike) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }

    const extension = this.extensionFromMimeType(file.mimetype);
    const uploadDir = join(process.cwd(), 'uploads', 'profile', userId);
    const filename = `${randomUUID()}${extension}`;

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), file.buffer);

    return `/uploads/profile/${userId}/${filename}`;
  }

  private extensionFromMimeType(mimetype: string) {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extensions[mimetype];

    if (!extension) {
      throw new BadRequestException('unsupported image type');
    }

    return extension;
  }

  private async deleteLocalFile(url: string) {
    if (!url.startsWith('/uploads/profile/')) {
      return;
    }

    const relativePath = url.replace(/^\/uploads\//, '');

    try {
      await unlink(join(process.cwd(), 'uploads', relativePath));
    } catch {
      // The database update is authoritative; missing local files are ignored.
    }
  }
}
