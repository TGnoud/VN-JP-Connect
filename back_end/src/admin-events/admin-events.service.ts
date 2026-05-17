import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Model, Types } from 'mongoose';
import {
  Event,
  EventDocument,
  EventFormat,
  EventParticipant,
  EventParticipantDocument,
  EventStatus,
} from '../database/schemas';

type AdminEventPayload = Record<string, unknown>;

type UploadedFileLike = {
  buffer?: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
};

const EVENT_FORMATS: EventFormat[] = ['in-person', 'online', 'hybrid'];
const EVENT_STATUSES: EventStatus[] = ['published', 'draft'];
const COVER_IMAGE_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class AdminEventsService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventParticipant.name)
    private readonly eventParticipantModel: Model<EventParticipantDocument>,
  ) {}

  async listEvents() {
    const events = await this.eventModel
      .find()
      .sort({ event_date: -1, created_at: -1 })
      .lean()
      .exec();
    const participantCounts = await this.participantCounts(
      events.map((event) => event._id),
    );
    const responses = events.map((event) =>
      this.eventResponse(event, participantCounts.get(event._id.toString())),
    );

    return {
      events: responses,
      stats: {
        totalCount: responses.length,
        publishedCount: responses.filter((event) => event.status === 'published').length,
        draftCount: responses.filter((event) => event.status === 'draft').length,
      },
    };
  }

  async createEvent(currentUserId: string, payload: AdminEventPayload) {
    const organizerId = this.objectIdFromParam(currentUserId, 'currentUserId');
    const normalized = this.normalizePayload(payload);
    const now = new Date();

    const created = await this.eventModel.create({
      organizer_id: organizerId,
      ...normalized,
      current_participants: 0,
      created_at: now,
      updated_at: now,
    });

    return this.eventResponse(created.toObject(), 0);
  }

  async updateEvent(eventId: string, payload: AdminEventPayload) {
    const eventObjectId = this.objectIdFromParam(eventId, 'eventId');
    const existing = await this.eventModel.findById(eventObjectId).lean().exec();

    if (!existing) {
      throw new NotFoundException('event was not found');
    }

    const normalized = this.normalizePayload(payload, existing);
    const updated = await this.eventModel
      .findByIdAndUpdate(
        eventObjectId,
        {
          $set: {
            ...normalized,
            updated_at: new Date(),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('event was not found');
    }

    const participantCount = await this.eventParticipantModel
      .countDocuments({ event_id: eventObjectId })
      .exec();

    return this.eventResponse(updated, participantCount);
  }

  async deleteEvent(eventId: string) {
    const eventObjectId = this.objectIdFromParam(eventId, 'eventId');
    const deleted = await this.eventModel
      .findByIdAndDelete(eventObjectId)
      .lean()
      .exec();

    if (!deleted) {
      throw new NotFoundException('event was not found');
    }

    await this.eventParticipantModel.deleteMany({ event_id: eventObjectId }).exec();

    return { id: eventObjectId.toString(), deleted: true };
  }

  async uploadCoverImage(file: UploadedFileLike) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }

    if (!COVER_IMAGE_MIME_TYPES[file.mimetype]) {
      throw new BadRequestException('unsupported cover image type');
    }

    if ((file.size ?? file.buffer.length) > COVER_IMAGE_MAX_BYTES) {
      throw new BadRequestException('cover image must be at most 5MB');
    }

    const uploadDir = join(process.cwd(), 'uploads', 'admin-events');
    const filename = `${randomUUID()}${COVER_IMAGE_MIME_TYPES[file.mimetype]}`;

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), file.buffer);

    return { url: `/uploads/admin-events/${filename}` };
  }

  private normalizePayload(payload: AdminEventPayload, fallback?: Record<string, any>) {
    const fallbackStartDate =
      fallback?.start_date ?? (fallback?.event_date ? this.dateString(fallback.event_date) : undefined);
    const fallbackStartTime =
      fallback?.start_time ?? (fallback?.event_date ? this.timeString(fallback.event_date) : undefined);
    const title = this.stringField(payload.title, 'title', {
      required: !fallback,
      fallback: fallback?.title,
      maxLength: 120,
    });
    const description = this.stringField(payload.description, 'description', {
      fallback: fallback?.description,
      maxLength: 3000,
    });
    const category = this.stringField(payload.category, 'category', {
      fallback: fallback?.category,
      maxLength: 80,
    });
    const language = this.stringField(payload.language, 'language', {
      fallback: fallback?.language,
      maxLength: 80,
    });
    const format = this.enumField<EventFormat>(payload.format, 'format', EVENT_FORMATS, {
      fallback: fallback?.format ?? 'in-person',
    });
    const status = this.enumField<EventStatus>(
      payload.status,
      'status',
      EVENT_STATUSES,
      { fallback: fallback?.status ?? 'draft' },
    );
    const startDate = this.dateField(payload.startDate, 'startDate', {
      required: !fallback,
      fallback: fallbackStartDate,
    });
    const startTime = this.timeField(payload.startTime, 'startTime', {
      required: !fallback,
      fallback: fallbackStartTime,
    });
    const endDate = this.dateField(payload.endDate, 'endDate', {
      required: !fallback,
      fallback: fallback?.end_date ?? startDate,
    });
    const endTime = this.timeField(payload.endTime, 'endTime', {
      required: !fallback,
      fallback: fallback?.end_time ?? startTime,
    });
    const location = this.stringField(payload.location, 'location', {
      fallback: fallback?.location,
      maxLength: 500,
    });
    const onlineUrl = this.stringField(payload.onlineUrl, 'onlineUrl', {
      fallback: fallback?.online_url,
      maxLength: 1000,
    });
    const coverImageUrl = this.stringField(payload.coverImageUrl, 'coverImageUrl', {
      fallback: fallback?.cover_image_url,
      maxLength: 2000,
    });
    const capacity = this.capacityField(payload.capacity, fallback?.capacity);

    if ((format === 'in-person' || format === 'hybrid') && !location) {
      throw new BadRequestException('location is required for in-person or hybrid events');
    }

    if ((format === 'online' || format === 'hybrid') && !onlineUrl) {
      throw new BadRequestException('onlineUrl is required for online or hybrid events');
    }

    const eventDate = this.dateTimeFromFields(startDate, startTime);
    const endDateTime = this.dateTimeFromFields(endDate, endTime);

    if (endDateTime.getTime() < eventDate.getTime()) {
      throw new BadRequestException('end date/time must be after start date/time');
    }

    return {
      title,
      description,
      category,
      language,
      format,
      event_date: eventDate,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      location: format === 'online' ? '' : location,
      online_url: format === 'in-person' ? '' : onlineUrl,
      capacity,
      cover_image_url: coverImageUrl,
      status,
    };
  }

  private eventResponse(event: Record<string, any>, participantCount?: number) {
    const startDate = event.start_date || this.dateString(event.event_date);
    const startTime = event.start_time || this.timeString(event.event_date);
    const endDate = event.end_date || startDate;
    const endTime = event.end_time || startTime;
    const currentParticipants =
      participantCount ?? event.current_participants ?? 0;

    return {
      id: event._id.toString(),
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
      currentParticipants,
      coverImageUrl: event.cover_image_url ?? '',
      status: event.status ?? 'draft',
      createdAt: event.created_at ?? event.event_date,
      updatedAt: event.updated_at ?? event.event_date,
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

  private stringField(
    value: unknown,
    name: string,
    options: { required?: boolean; fallback?: unknown; maxLength?: number } = {},
  ) {
    const rawValue = value === undefined ? options.fallback : value;

    if (rawValue === undefined || rawValue === null) {
      if (options.required) {
        throw new BadRequestException(`${name} is required`);
      }
      return '';
    }

    if (typeof rawValue !== 'string') {
      throw new BadRequestException(`${name} must be a string`);
    }

    const trimmed = rawValue.trim();
    if (options.required && !trimmed) {
      throw new BadRequestException(`${name} is required`);
    }

    if (options.maxLength && trimmed.length > options.maxLength) {
      throw new BadRequestException(`${name} must be at most ${options.maxLength} characters`);
    }

    return trimmed;
  }

  private enumField<T extends string>(
    value: unknown,
    name: string,
    allowed: readonly T[],
    options: { fallback: T },
  ) {
    const rawValue = value === undefined ? options.fallback : value;

    if (typeof rawValue !== 'string' || !allowed.includes(rawValue as T)) {
      throw new BadRequestException(`${name} is not supported`);
    }

    return rawValue as T;
  }

  private dateField(
    value: unknown,
    name: string,
    options: { required?: boolean; fallback?: unknown } = {},
  ) {
    const fieldValue = this.stringField(value, name, options);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fieldValue)) {
      throw new BadRequestException(`${name} must use YYYY-MM-DD format`);
    }

    return fieldValue;
  }

  private timeField(
    value: unknown,
    name: string,
    options: { required?: boolean; fallback?: unknown } = {},
  ) {
    const fieldValue = this.stringField(value, name, options);

    if (!/^\d{2}:\d{2}$/.test(fieldValue)) {
      throw new BadRequestException(`${name} must use HH:mm format`);
    }

    return fieldValue;
  }

  private capacityField(value: unknown, fallback?: unknown) {
    const rawValue = value === undefined ? fallback : value;

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return null;
    }

    const capacity = Number(rawValue);
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new BadRequestException('capacity must be a positive integer');
    }

    return capacity;
  }

  private dateTimeFromFields(date: string, time: string) {
    const dateTime = new Date(`${date}T${time}:00.000Z`);

    if (Number.isNaN(dateTime.getTime())) {
      throw new BadRequestException('event date/time is invalid');
    }

    return dateTime;
  }

  private dateString(value: Date | string) {
    return new Date(value).toISOString().slice(0, 10);
  }

  private timeString(value: Date | string) {
    return new Date(value).toISOString().slice(11, 16);
  }

  private objectIdFromParam(value: string, name: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} must be a valid ObjectId`);
    }

    return new Types.ObjectId(value);
  }
}
