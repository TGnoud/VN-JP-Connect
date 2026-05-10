import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const NATIONALITIES = ['JP', 'VN'] as const;
export const TAG_TYPES = ['interest', 'purpose'] as const;
export const MATCH_STATUSES = ['pending', 'accepted', 'rejected'] as const;

export type Nationality = (typeof NATIONALITIES)[number];
export type TagType = (typeof TAG_TYPES)[number];
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export type UserDocument = HydratedDocument<User>;
export type TagDocument = HydratedDocument<Tag>;
export type UserInterestDocument = HydratedDocument<UserInterest>;
export type MatchDocument = HydratedDocument<Match>;
export type ConversationDocument = HydratedDocument<Conversation>;
export type MessageDocument = HydratedDocument<Message>;
export type EventDocument = HydratedDocument<Event>;
export type EventParticipantDocument = HydratedDocument<EventParticipant>;

@Schema({ collection: 'users', versionKey: false })
export class User {
  @Prop({ required: true, unique: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone_number: string;

  @Prop({ required: true })
  password_hash: string;

  @Prop({ required: true, trim: true })
  full_name: string;

  @Prop({ required: true, enum: NATIONALITIES })
  nationality: Nationality;

  @Prop({ required: true, default: false })
  is_verified: boolean;

  @Prop({ required: true, default: Date.now })
  created_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true, name: 'users_email_unique' });

@Schema({ collection: 'tags', versionKey: false })
export class Tag {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: TAG_TYPES })
  type: TagType;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
TagSchema.index({ name: 1, type: 1 }, { unique: true, name: 'tags_name_type_unique' });

@Schema({ collection: 'user_interests', versionKey: false })
export class UserInterest {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: Tag.name })
  tag_id: Types.ObjectId;
}

export const UserInterestSchema = SchemaFactory.createForClass(UserInterest);
UserInterestSchema.index(
  { user_id: 1, tag_id: 1 },
  { unique: true, name: 'user_interests_user_tag_unique' },
);
UserInterestSchema.index({ tag_id: 1 }, { name: 'user_interests_tag_id_idx' });

@Schema({ collection: 'matches', versionKey: false })
export class Match {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  requester_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  receiver_id: Types.ObjectId;

  @Prop({ required: true, enum: MATCH_STATUSES, default: 'pending' })
  status: MatchStatus;

  @Prop({ required: true, default: Date.now })
  created_at: Date;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
MatchSchema.index(
  { requester_id: 1, receiver_id: 1 },
  { unique: true, name: 'matches_requester_receiver_unique' },
);
MatchSchema.index({ receiver_id: 1 }, { name: 'matches_receiver_id_idx' });

@Schema({ collection: 'conversations', versionKey: false })
export class Conversation {
  @Prop({ required: true, type: Types.ObjectId, ref: Match.name })
  match_id: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  created_at: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index(
  { match_id: 1 },
  { unique: true, name: 'conversations_match_id_unique' },
);

@Schema({ collection: 'messages', versionKey: false })
export class Message {
  @Prop({ required: true, type: Types.ObjectId, ref: Conversation.name })
  conversation_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  sender_id: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  translated_content: string;

  @Prop({ required: true, default: Date.now })
  sent_at: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index(
  { conversation_id: 1, sent_at: 1 },
  { name: 'messages_conversation_sent_at_idx' },
);
MessageSchema.index({ sender_id: 1 }, { name: 'messages_sender_id_idx' });

@Schema({ collection: 'events', versionKey: false })
export class Event {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  organizer_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  event_date: Date;

  @Prop({ required: true, trim: true })
  location: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ organizer_id: 1 }, { name: 'events_organizer_id_idx' });
EventSchema.index({ event_date: 1 }, { name: 'events_event_date_idx' });

@Schema({ collection: 'event_participants', versionKey: false })
export class EventParticipant {
  @Prop({ required: true, type: Types.ObjectId, ref: Event.name })
  event_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  joined_at: Date;
}

export const EventParticipantSchema = SchemaFactory.createForClass(EventParticipant);
EventParticipantSchema.index(
  { event_id: 1, user_id: 1 },
  { unique: true, name: 'event_participants_event_user_unique' },
);
EventParticipantSchema.index(
  { user_id: 1 },
  { name: 'event_participants_user_id_idx' },
);
