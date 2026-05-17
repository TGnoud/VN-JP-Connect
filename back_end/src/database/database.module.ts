import 'dotenv/config';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { resolveMongoConfig } from './database.config';
import {
  Conversation,
  ConversationFeedback,
  ConversationFeedbackSchema,
  ConversationSchema,
  Event,
  EventParticipant,
  EventParticipantSchema,
  EventSchema,
  Match,
  MatchSchema,
  Message,
  MessageSchema,
  Profile,
  ProfileSchema,
  Tag,
  TagSchema,
  User,
  UserInterest,
  UserInterestSchema,
  UserReport,
  UserReportSchema,
  UserSchema,
} from './schemas';

const mongoConfig = resolveMongoConfig();

console.log(`MongoDB target: ${mongoConfig.target} (${mongoConfig.dbName})`);

@Module({
  imports: [
    MongooseModule.forRoot(mongoConfig.uri, { dbName: mongoConfig.dbName }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tag.name, schema: TagSchema },
      { name: UserInterest.name, schema: UserInterestSchema },
      { name: Match.name, schema: MatchSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: ConversationFeedback.name, schema: ConversationFeedbackSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Profile.name, schema: ProfileSchema },
      { name: UserReport.name, schema: UserReportSchema },
      { name: Event.name, schema: EventSchema },
      { name: EventParticipant.name, schema: EventParticipantSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
