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
  const originalGeminiApiKey = process.env.GEMINI_API_KEY;
  const originalGeminiModel = process.env.GEMINI_TRANSLATE_MODEL;

  afterEach(() => {
    if (originalGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiApiKey;
    }
    if (originalGeminiModel === undefined) {
      delete process.env.GEMINI_TRANSLATE_MODEL;
    } else {
      process.env.GEMINI_TRANSLATE_MODEL = originalGeminiModel;
    }
    jest.restoreAllMocks();
  });

  function serviceForTranslation() {
    return new ConversationsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  function mockGeminiFetch(text: string, ok = true, status = 200) {
    return jest.spyOn(global, 'fetch').mockResolvedValue({
      ok,
      status,
      json: jest.fn().mockResolvedValue(
        ok
          ? {
              candidates: [
                {
                  content: {
                    parts: [{ text }],
                  },
                },
              ],
            }
          : { error: { message: text } },
      ),
    } as any);
  }

  it('translates Vietnamese to Japanese with Gemini', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_TRANSLATE_MODEL = 'gemini-test';
    const fetchMock = mockGeminiFetch('こんにちは');
    const service = serviceForTranslation();
    const currentUserId = new Types.ObjectId().toString();

    const result = await service.translate(currentUserId, {
      text: 'chào',
      direction: 'vi-ja',
    });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(result).toEqual({
      direction: 'vi-ja',
      translatedText: 'こんにちは',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
    );
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'test-key' });
    expect(body.contents[0].parts[0].text).toContain(
      'Translate from Vietnamese to Japanese.',
    );
  });

  it('translates Japanese to Vietnamese with Gemini', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const fetchMock = mockGeminiFetch('Xin chào');
    const service = serviceForTranslation();
    const currentUserId = new Types.ObjectId().toString();

    const result = await service.translate(currentUserId, {
      text: 'こんにちは',
      direction: 'ja-vi',
    });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(result).toEqual({
      direction: 'ja-vi',
      translatedText: 'Xin chào',
    });
    expect(body.contents[0].parts[0].text).toContain(
      'Translate from Japanese to Vietnamese.',
    );
  });

  it('normalizes markdown fences, labels, and quotes from Gemini output', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGeminiFetch('```text\nTranslation: "こんにちは"\n```');
    const service = serviceForTranslation();
    const currentUserId = new Types.ObjectId().toString();

    await expect(
      service.translate(currentUserId, { text: 'chào', direction: 'vi-ja' }),
    ).resolves.toEqual({
      direction: 'vi-ja',
      translatedText: 'こんにちは',
    });
  });

  it('fails clearly when Gemini API key is missing', async () => {
    process.env.GEMINI_API_KEY = '';
    const service = serviceForTranslation();
    const currentUserId = new Types.ObjectId().toString();

    await expect(
      service.translate(currentUserId, { text: 'chào', direction: 'vi-ja' }),
    ).rejects.toThrow('GEMINI_API_KEY is not configured');
  });

  it('does not return a fake translation when Gemini fails', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    mockGeminiFetch('quota exceeded', false, 429);
    const service = serviceForTranslation();
    const currentUserId = new Types.ObjectId().toString();

    await expect(
      service.translate(currentUserId, { text: 'chào', direction: 'vi-ja' }),
    ).rejects.toThrow('Gemini translation failed: quota exceeded');
  });

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
