import { Types } from 'mongoose';
import { ConversationsService } from './conversations.service';

function queryMock<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function countMock(value: number) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('ConversationsService', () => {
  it('returns localized language level and partner online state in conversation summaries', async () => {
    const currentUserId = new Types.ObjectId();
    const partnerUserId = new Types.ObjectId();
    const conversationId = new Types.ObjectId();
    const matchId = new Types.ObjectId();
    const now = new Date();
    const conversation = {
      _id: conversationId,
      match_id: matchId,
      type: 'direct',
      title: '',
      participant_ids: [currentUserId, partnerUserId],
      created_at: now,
      updated_at: now,
      last_message_at: now,
    };
    const latestMessage = {
      _id: new Types.ObjectId(),
      conversation_id: conversationId,
      sender_id: partnerUserId,
      content: 'こんにちは',
      sent_at: now,
    };
    const userModel = {
      find: jest.fn().mockReturnValue(queryMock([
        {
          _id: currentUserId,
          full_name: 'Current User',
          nationality: 'VN',
          created_at: now,
        },
        {
          _id: partnerUserId,
          full_name: 'Tanaka Hiroshi',
          nationality: 'JP',
          created_at: now,
          last_seen_at: now,
        },
      ])),
    };
    const profileModel = {
      find: jest.fn().mockReturnValue(queryMock([
        {
          user_id: partnerUserId,
          location: '東京',
          avatar_url: '',
          languages: [{ language: 'Japanese', level: 'N2' }],
        },
      ])),
    };
    const matchModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const conversationModel = {
      find: jest.fn().mockReturnValue(queryMock([conversation])),
    };
    const messageModel = {
      findOne: jest.fn().mockReturnValue(queryMock(latestMessage)),
      countDocuments: jest.fn().mockReturnValue(countMock(0)),
    };
    const service = new ConversationsService(
      userModel as any,
      profileModel as any,
      matchModel as any,
      conversationModel as any,
      messageModel as any,
      {} as any,
    );

    const result = await service.listConversations(currentUserId.toString());

    expect(result[0]).toMatchObject({
      id: conversationId.toString(),
      name: 'Tanaka Hiroshi',
      level: '日本語 N2',
      isOnline: true,
      participants: expect.arrayContaining([
        expect.objectContaining({
          id: partnerUserId.toString(),
          level: '日本語 N2',
          isOnline: true,
        }),
      ]),
    });
  });
});
