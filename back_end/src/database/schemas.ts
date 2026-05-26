import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const NATIONALITIES = ['JP', 'VN'] as const;
export const USER_STATUSES = ['active', 'frozen'] as const;
export const USER_ROLES = ['customer', 'admin'] as const;
export const TAG_TYPES = ['interest', 'purpose'] as const;
export const MATCH_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export const CONVERSATION_TYPES = ['direct', 'group'] as const;
export const MESSAGE_TYPES = [
  'text',
  'file',
  'media',
  'voice',
  'system',
] as const;
export const MESSAGE_STATUSES = ['sent', 'read'] as const;
export const CONVERSATION_FEEDBACK_VALUES = ['liked', 'skipped'] as const;
export const EVENT_FORMATS = ['in-person', 'online', 'hybrid'] as const;
export const EVENT_STATUSES = ['published', 'draft'] as const;
export const PROFILE_GENDERS = ['male', 'female', 'other'] as const;
export const USER_REPORT_REASONS = [
  'spam',
  'inappropriate_content',
  'harassment',
  'fake_profile',
  'other',
] as const;
export const USER_REPORT_STATUSES = [
  'pending',
  'reviewed',
  'dismissed',
] as const;

export type Nationality = (typeof NATIONALITIES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];
export type TagType = (typeof TAG_TYPES)[number];
export type MatchStatus = (typeof MATCH_STATUSES)[number];
export type ConversationType = (typeof CONVERSATION_TYPES)[number];
export type MessageType = (typeof MESSAGE_TYPES)[number];
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export type ConversationFeedbackValue =
  (typeof CONVERSATION_FEEDBACK_VALUES)[number];
export type EventFormat = (typeof EVENT_FORMATS)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type ProfileGender = (typeof PROFILE_GENDERS)[number];
export type UserReportReason = (typeof USER_REPORT_REASONS)[number];
export type UserReportStatus = (typeof USER_REPORT_STATUSES)[number];

export type UserDocument = HydratedDocument<User>;
export type PasswordResetOtpDocument = HydratedDocument<PasswordResetOtp>;
export type PasswordResetSessionDocument =
  HydratedDocument<PasswordResetSession>;
export type TagDocument = HydratedDocument<Tag>;
export type UserInterestDocument = HydratedDocument<UserInterest>;
export type MatchDocument = HydratedDocument<Match>;
export type ConversationDocument = HydratedDocument<Conversation>;
export type MessageDocument = HydratedDocument<Message>;
export type ConversationFeedbackDocument =
  HydratedDocument<ConversationFeedback>;
export type EventDocument = HydratedDocument<Event>;
export type EventParticipantDocument = HydratedDocument<EventParticipant>;
export type EventBookmarkDocument = HydratedDocument<EventBookmark>;
export type ProfileDocument = HydratedDocument<Profile>;
export type UserReportDocument = HydratedDocument<UserReport>;

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

  @Prop({ required: true, type: String, enum: NATIONALITIES })
  nationality: Nationality;

  @Prop()
  birth_date?: Date;

  @Prop({ required: true, default: false })
  is_verified: boolean;

  @Prop({ required: true, default: Date.now })
  created_at: Date;

  @Prop({
    required: true,
    type: String,
    enum: USER_STATUSES,
    default: 'active',
  })
  status: UserStatus;

  @Prop({ required: true, default: Date.now })
  status_updated_at: Date;

  @Prop({
    required: true,
    type: String,
    enum: USER_ROLES,
    default: 'customer',
  })
  role: UserRole;

  @Prop()
  last_seen_at?: Date;

  @Prop({ trim: true })
  reset_code?: string;

  @Prop()
  reset_code_expires_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true, name: 'users_email_unique' });
UserSchema.index(
  { status: 1, status_updated_at: -1 },
  { name: 'users_status_updated_at_idx' },
);
UserSchema.index({ role: 1 }, { name: 'users_role_idx' });

@Schema({ collection: 'password_reset_otps', versionKey: false })
export class PasswordResetOtp {
  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  otp_hash: string;

  @Prop({ required: true })
  expires_at: Date;

  @Prop({ required: true, default: Date.now })
  created_at: Date;
}

export const PasswordResetOtpSchema =
  SchemaFactory.createForClass(PasswordResetOtp);
PasswordResetOtpSchema.index(
  { email: 1, created_at: -1 },
  { name: 'password_reset_otps_email_created_idx' },
);
PasswordResetOtpSchema.index(
  { expires_at: 1 },
  { expireAfterSeconds: 0, name: 'password_reset_otps_expires_ttl_idx' },
);

@Schema({ collection: 'password_reset_sessions', versionKey: false })
export class PasswordResetSession {
  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  token_hash: string;

  @Prop({ required: true })
  expires_at: Date;

  @Prop({ required: true, default: Date.now })
  created_at: Date;
}

export const PasswordResetSessionSchema =
  SchemaFactory.createForClass(PasswordResetSession);
PasswordResetSessionSchema.index(
  { email: 1, created_at: -1 },
  { name: 'password_reset_sessions_email_created_idx' },
);
PasswordResetSessionSchema.index(
  { expires_at: 1 },
  { expireAfterSeconds: 0, name: 'password_reset_sessions_expires_ttl_idx' },
);

export class SocialLinks {
  @Prop({ trim: true, default: '' })
  instagram: string;

  @Prop({ trim: true, default: '' })
  facebook: string;

  @Prop({ trim: true, default: '' })
  line: string;
}

export class LanguageSkill {
  @Prop({ required: true, trim: true })
  language: string;

  @Prop({ required: true, trim: true })
  level: string;
}

export class ProfilePhoto {
  @Prop({
    required: true,
    type: Types.ObjectId,
    default: () => new Types.ObjectId(),
  })
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ trim: true, default: '' })
  public_id?: string;

  @Prop({ required: true, default: false })
  is_main: boolean;

  @Prop({ required: true, default: Date.now })
  uploaded_at: Date;
}

@Schema({ collection: 'profiles', versionKey: false })
export class Profile {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ min: 0, max: 120 })
  age?: number;

  @Prop({ type: String, enum: PROFILE_GENDERS })
  gender?: ProfileGender;

  @Prop({ trim: true, default: '' })
  location: string;

  @Prop({ trim: true, default: '' })
  occupation: string;

  @Prop({ trim: true, default: '' })
  education: string;

  @Prop({ trim: true, maxlength: 300, default: '' })
  bio: string;

  @Prop({ trim: true, default: '' })
  avatar_url: string;

  @Prop({ trim: true, default: '' })
  cover_url: string;

  @Prop({ type: SocialLinks, default: () => ({}) })
  social_links: SocialLinks;

  @Prop({ type: [LanguageSkill], default: [] })
  languages: LanguageSkill[];

  @Prop({ type: [ProfilePhoto], default: [] })
  photos: ProfilePhoto[];

  @Prop({ min: 0, max: 100 })
  match_rate?: number;

  @Prop({ min: 0 })
  connections_count?: number;

  @Prop({ required: true, default: Date.now })
  updated_at: Date;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
ProfileSchema.index(
  { user_id: 1 },
  { unique: true, name: 'profiles_user_id_unique' },
);

@Schema({ collection: 'tags', versionKey: false })
export class Tag {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, type: String, enum: TAG_TYPES })
  type: TagType;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
TagSchema.index(
  { name: 1, type: 1 },
  { unique: true, name: 'tags_name_type_unique' },
);

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

  @Prop({
    required: true,
    type: String,
    enum: MATCH_STATUSES,
    default: 'pending',
  })
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
  @Prop({ type: Types.ObjectId, ref: Match.name })
  match_id?: Types.ObjectId;

  @Prop({
    required: true,
    type: String,
    enum: CONVERSATION_TYPES,
    default: 'direct',
  })
  type: ConversationType;

  @Prop({ trim: true, maxlength: 50, default: '' })
  title: string;

  @Prop({ type: Types.ObjectId, ref: User.name })
  created_by?: Types.ObjectId;

  @Prop({ required: true, type: [Types.ObjectId], ref: User.name, default: [] })
  participant_ids: Types.ObjectId[];

  @Prop({ required: true, default: Date.now })
  created_at: Date;

  @Prop({ required: true, default: Date.now })
  updated_at: Date;

  @Prop({ default: Date.now })
  last_message_at?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index(
  { match_id: 1 },
  {
    unique: true,
    name: 'conversations_match_id_unique',
    partialFilterExpression: { match_id: { $type: 'objectId' } },
  },
);
ConversationSchema.index(
  { participant_ids: 1, last_message_at: -1 },
  { name: 'conversations_participant_last_message_idx' },
);

export class MessageAttachment {
  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ trim: true, default: '' })
  file_name?: string;

  @Prop({ trim: true, default: '' })
  mime_type?: string;

  @Prop({ min: 0, default: 0 })
  size?: number;
}

@Schema({ collection: 'messages', versionKey: false })
export class Message {
  @Prop({ required: true, type: Types.ObjectId, ref: Conversation.name })
  conversation_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  sender_id: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: '' })
  translated_content: string;

  @Prop({ required: true, type: String, enum: MESSAGE_TYPES, default: 'text' })
  message_type: MessageType;

  @Prop({
    required: true,
    type: String,
    enum: MESSAGE_STATUSES,
    default: 'sent',
  })
  status: MessageStatus;

  @Prop({ type: [Types.ObjectId], ref: User.name, default: [] })
  read_by: Types.ObjectId[];

  @Prop({ type: [MessageAttachment], default: [] })
  attachments: MessageAttachment[];

  @Prop({ required: true, default: Date.now })
  sent_at: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index(
  { conversation_id: 1, sent_at: 1 },
  { name: 'messages_conversation_sent_at_idx' },
);
MessageSchema.index({ sender_id: 1 }, { name: 'messages_sender_id_idx' });
MessageSchema.index(
  { conversation_id: 1, sender_id: 1, read_by: 1 },
  { name: 'messages_unread_lookup_idx' },
);

@Schema({ collection: 'conversation_feedbacks', versionKey: false })
export class ConversationFeedback {
  @Prop({ required: true, type: Types.ObjectId, ref: Conversation.name })
  conversation_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  reviewer_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  target_user_id: Types.ObjectId;

  @Prop({ required: true, type: String, enum: CONVERSATION_FEEDBACK_VALUES })
  value: ConversationFeedbackValue;

  @Prop({ required: true, default: Date.now })
  created_at: Date;
}

export const ConversationFeedbackSchema =
  SchemaFactory.createForClass(ConversationFeedback);
ConversationFeedbackSchema.index(
  { conversation_id: 1, reviewer_id: 1 },
  { unique: true, name: 'conversation_feedbacks_conversation_reviewer_unique' },
);
ConversationFeedbackSchema.index(
  { target_user_id: 1, value: 1 },
  { name: 'conversation_feedbacks_target_value_idx' },
);

export class UserReportEvidence {
  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ trim: true, default: '' })
  public_id?: string;

  @Prop({ required: true, trim: true })
  mime_type: string;

  @Prop({ trim: true, default: '' })
  original_name?: string;

  @Prop({ min: 0, default: 0 })
  size?: number;
}

@Schema({ collection: 'user_reports', versionKey: false })
export class UserReport {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  reporter_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  reported_user_id: Types.ObjectId;

  @Prop({ required: true, type: String, enum: USER_REPORT_REASONS })
  reason: UserReportReason;

  @Prop({ trim: true, default: '' })
  detail: string;

  @Prop({ type: [UserReportEvidence], default: [] })
  evidence_files: UserReportEvidence[];

  @Prop({
    required: true,
    type: String,
    enum: USER_REPORT_STATUSES,
    default: 'pending',
  })
  status: UserReportStatus;

  @Prop({ required: true, default: Date.now })
  created_at: Date;
}

export const UserReportSchema = SchemaFactory.createForClass(UserReport);
UserReportSchema.index(
  { reporter_id: 1, reported_user_id: 1, created_at: -1 },
  { name: 'user_reports_reporter_reported_created_idx' },
);
UserReportSchema.index(
  { reported_user_id: 1, status: 1 },
  { name: 'user_reports_reported_status_idx' },
);
UserReportSchema.index(
  { reported_user_id: 1, reporter_id: 1 },
  { name: 'user_reports_reported_reporter_idx' },
);

@Schema({ collection: 'events', versionKey: false })
export class Event {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  organizer_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ trim: true, default: '' })
  category: string;

  @Prop({ trim: true, default: '' })
  language: string;

  @Prop({
    required: true,
    type: String,
    enum: EVENT_FORMATS,
    default: 'in-person',
  })
  format: EventFormat;

  @Prop({ required: true })
  event_date: Date;

  @Prop({ trim: true, default: '' })
  start_date: string;

  @Prop({ trim: true, default: '' })
  start_time: string;

  @Prop({ trim: true, default: '' })
  end_date: string;

  @Prop({ trim: true, default: '' })
  end_time: string;

  @Prop({ trim: true, default: '' })
  location: string;

  @Prop({ trim: true, default: '' })
  online_url: string;

  @Prop({ type: Number, min: 1, default: null })
  capacity: number | null;

  @Prop({ min: 0, default: 0 })
  current_participants: number;

  @Prop({ trim: true, default: '' })
  cover_image_url: string;

  @Prop({
    required: true,
    type: String,
    enum: EVENT_STATUSES,
    default: 'draft',
  })
  status: EventStatus;

  @Prop({ required: true, default: Date.now })
  created_at: Date;

  @Prop({ required: true, default: Date.now })
  updated_at: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ organizer_id: 1 }, { name: 'events_organizer_id_idx' });
EventSchema.index({ event_date: 1 }, { name: 'events_event_date_idx' });
EventSchema.index(
  { status: 1, event_date: 1 },
  { name: 'events_status_event_date_idx' },
);

@Schema({ collection: 'event_participants', versionKey: false })
export class EventParticipant {
  @Prop({ required: true, type: Types.ObjectId, ref: Event.name })
  event_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  joined_at: Date;
}

export const EventParticipantSchema =
  SchemaFactory.createForClass(EventParticipant);
EventParticipantSchema.index(
  { event_id: 1, user_id: 1 },
  { unique: true, name: 'event_participants_event_user_unique' },
);
EventParticipantSchema.index(
  { user_id: 1 },
  { name: 'event_participants_user_id_idx' },
);

@Schema({ collection: 'event_bookmarks', versionKey: false })
export class EventBookmark {
  @Prop({ required: true, type: Types.ObjectId, ref: Event.name })
  event_id: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user_id: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  created_at: Date;
}

export const EventBookmarkSchema =
  SchemaFactory.createForClass(EventBookmark);
EventBookmarkSchema.index(
  { event_id: 1, user_id: 1 },
  { unique: true, name: 'event_bookmarks_event_user_unique' },
);
EventBookmarkSchema.index(
  { user_id: 1 },
  { name: 'event_bookmarks_user_id_idx' },
);
