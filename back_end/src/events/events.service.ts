import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Event,
  EventBookmark,
  EventBookmarkDocument,
  EventDocument,
  EventParticipant,
  EventParticipantDocument,
  Profile,
  ProfileDocument,
  User,
  UserDocument,
} from '../database/schemas';

type ListEventsQuery = {
  search?: string;
  category?: string;
};

type ParticipantPreview = {
  id: string;
  fullName: string;
  avatarUrl: string;
};

const ALL_CATEGORY_LABEL = 'すべて';
const PREVIEW_PARTICIPANT_LIMIT = 4;

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventParticipant.name)
    private readonly eventParticipantModel: Model<EventParticipantDocument>,
    @InjectModel(EventBookmark.name)
    private readonly eventBookmarkModel: Model<EventBookmarkDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
  ) {}

  async listEvents(currentUserId: string, query: ListEventsQuery = {}) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const filter: Record<string, any> = { status: 'published' };
    const search = query.search?.trim();
    const category = query.category?.trim();

    if (category && category !== ALL_CATEGORY_LABEL) {
      filter.category = category;
    }

    if (search) {
      const escapedSearch = this.escapeRegex(search);
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { category: { $regex: escapedSearch, $options: 'i' } },
        { location: { $regex: escapedSearch, $options: 'i' } },
        { online_url: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const events = await this.eventModel
      .find(filter)
      .sort({ event_date: 1, created_at: -1 })
      .lean()
      .exec();

    const context = await this.responseContext(
      events.map((event) => event._id),
      currentObjectId,
    );

    return {
      events: events.map((event) => this.eventResponse(event, context)),
    };
  }

  async getEvent(currentUserId: string, eventId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const event = await this.requirePublishedEvent(eventId);
    const context = await this.responseContext([event._id], currentObjectId);

    return this.eventResponse(event, context);
  }

  async joinEvent(currentUserId: string, eventId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const event = await this.requirePublishedEvent(eventId);
    const existingParticipant = await this.eventParticipantModel
      .findOne({ event_id: event._id, user_id: currentObjectId })
      .lean()
      .exec();

    if (!existingParticipant) {
      const participantCount = await this.eventParticipantModel
        .countDocuments({ event_id: event._id })
        .exec();

      if (
        event.capacity !== null &&
        event.capacity !== undefined &&
        participantCount >= event.capacity
      ) {
        throw new BadRequestException('event is full');
      }

      try {
        await this.eventParticipantModel.create({
          event_id: event._id,
          user_id: currentObjectId,
          joined_at: new Date(),
        });
      } catch (error: any) {
        if (error?.code !== 11000) {
          throw error;
        }
      }
    }

    await this.syncParticipantCount(event._id);
    return this.getEvent(currentUserId, event._id.toString());
  }

  async leaveEvent(currentUserId: string, eventId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const event = await this.requirePublishedEvent(eventId);

    await this.eventParticipantModel
      .deleteOne({ event_id: event._id, user_id: currentObjectId })
      .exec();
    await this.syncParticipantCount(event._id);

    return this.getEvent(currentUserId, event._id.toString());
  }

  async bookmarkEvent(currentUserId: string, eventId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const event = await this.requirePublishedEvent(eventId);

    await this.eventBookmarkModel
      .updateOne(
        { event_id: event._id, user_id: currentObjectId },
        {
          $setOnInsert: {
            event_id: event._id,
            user_id: currentObjectId,
            created_at: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();

    return this.getEvent(currentUserId, event._id.toString());
  }

  async unbookmarkEvent(currentUserId: string, eventId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const event = await this.requirePublishedEvent(eventId);

    await this.eventBookmarkModel
      .deleteOne({ event_id: event._id, user_id: currentObjectId })
      .exec();

    return this.getEvent(currentUserId, event._id.toString());
  }

  private async requirePublishedEvent(eventId: string) {
    const eventObjectId = this.objectIdFromParam(eventId, 'eventId');
    const event = await this.eventModel
      .findOne({ _id: eventObjectId, status: 'published' })
      .lean()
      .exec();

    if (!event) {
      throw new NotFoundException('event was not found');
    }

    return event;
  }

  private async responseContext(
    eventIds: Types.ObjectId[],
    currentObjectId: Types.ObjectId,
  ) {
    const [
      participantCounts,
      joinedParticipants,
      bookmarkedEvents,
      participantPreviews,
    ] = await Promise.all([
      this.participantCounts(eventIds),
      this.eventParticipantModel
        .find({ event_id: { $in: eventIds }, user_id: currentObjectId })
        .lean()
        .exec(),
      this.eventBookmarkModel
        .find({ event_id: { $in: eventIds }, user_id: currentObjectId })
        .lean()
        .exec(),
      this.participantPreviews(eventIds),
    ]);

    return {
      participantCounts,
      joinedEventIds: new Set(
        joinedParticipants.map((item) => item.event_id.toString()),
      ),
      bookmarkedEventIds: new Set(
        bookmarkedEvents.map((item) => item.event_id.toString()),
      ),
      participantPreviews,
    };
  }

  private eventResponse(
    event: Record<string, any>,
    context: {
      participantCounts: Map<string, number>;
      joinedEventIds: Set<string>;
      bookmarkedEventIds: Set<string>;
      participantPreviews: Map<string, ParticipantPreview[]>;
    },
  ) {
    const eventId = event._id.toString();
    const startDate = event.start_date || this.dateString(event.event_date);
    const startTime = event.start_time || this.timeString(event.event_date);
    const endDate = event.end_date || startDate;
    const endTime = event.end_time || startTime;

    return {
      id: eventId,
      title: event.title,
      description: event.description ?? '',
      category: event.category ?? '',
      language: event.language ?? '',
      format: event.format ?? 'in-person',
      location: event.location ?? '',
      onlineUrl: event.online_url ?? '',
      startDate,
      startTime,
      endDate,
      endTime,
      capacity: event.capacity ?? null,
      currentParticipants:
        context.participantCounts.get(eventId) ??
        event.current_participants ??
        0,
      coverImageUrl: event.cover_image_url ?? '',
      isJoined: context.joinedEventIds.has(eventId),
      isBookmarked: context.bookmarkedEventIds.has(eventId),
      participantsPreview: context.participantPreviews.get(eventId) ?? [],
      shareUrl: `/events?eventId=${eventId}`,
    };
  }

  private async participantCounts(eventIds: Types.ObjectId[]) {
    if (eventIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.eventParticipantModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { event_id: { $in: eventIds } } },
        { $group: { _id: '$event_id', count: { $sum: 1 } } },
      ])
      .exec();

    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }

  private async participantPreviews(eventIds: Types.ObjectId[]) {
    if (eventIds.length === 0) {
      return new Map<string, ParticipantPreview[]>();
    }

    const participants = await this.eventParticipantModel
      .find({ event_id: { $in: eventIds } })
      .sort({ joined_at: 1 })
      .lean()
      .exec();
    const userIdsByEvent = new Map<string, Types.ObjectId[]>();

    for (const participant of participants) {
      const eventId = participant.event_id.toString();
      const currentUserIds = userIdsByEvent.get(eventId) ?? [];
      if (currentUserIds.length < PREVIEW_PARTICIPANT_LIMIT) {
        currentUserIds.push(new Types.ObjectId(participant.user_id));
        userIdsByEvent.set(eventId, currentUserIds);
      }
    }

    const userIds = Array.from(userIdsByEvent.values()).flat();
    if (userIds.length === 0) {
      return new Map<string, ParticipantPreview[]>();
    }

    const [users, profiles] = await Promise.all([
      this.userModel.find({ _id: { $in: userIds } }).lean().exec(),
      this.profileModel.find({ user_id: { $in: userIds } }).lean().exec(),
    ]);
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const profilesByUserId = new Map(
      profiles.map((profile) => [profile.user_id.toString(), profile]),
    );
    const result = new Map<string, ParticipantPreview[]>();

    for (const [eventId, ids] of userIdsByEvent.entries()) {
      result.set(
        eventId,
        ids
          .map((id) => {
            const user = usersById.get(id.toString());
            if (!user) return null;
            const profile = profilesByUserId.get(id.toString());
            return {
              id: id.toString(),
              fullName: user.full_name,
              avatarUrl:
                profile?.avatar_url ||
                `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(
                  id.toString(),
                )}`,
            };
          })
          .filter((item): item is ParticipantPreview => Boolean(item)),
      );
    }

    return result;
  }

  private async syncParticipantCount(eventId: Types.ObjectId) {
    const currentParticipants = await this.eventParticipantModel
      .countDocuments({ event_id: eventId })
      .exec();

    await this.eventModel
      .updateOne({ _id: eventId }, { $set: { current_participants: currentParticipants } })
      .exec();
  }

  private objectIdFromParam(value: string, name: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} must be a valid ObjectId`);
    }

    return new Types.ObjectId(value);
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private dateString(value: Date) {
    return new Date(value).toISOString().slice(0, 10);
  }

  private timeString(value: Date) {
    return new Date(value).toISOString().slice(11, 16);
  }
}
