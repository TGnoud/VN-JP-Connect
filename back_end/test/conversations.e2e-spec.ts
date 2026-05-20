import { ForbiddenException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ConversationsController } from '../src/conversations/conversations.controller';
import { ConversationsService } from '../src/conversations/conversations.service';

describe('Conversations API (e2e)', () => {
  const currentUserId = '507f1f77bcf86cd799439011';
  const targetUserId = '507f1f77bcf86cd799439012';
  const conversationResponse = {
    id: '507f1f77bcf86cd799439013',
    matchId: '507f1f77bcf86cd799439014',
    partner: {
      id: targetUserId,
      fullName: 'Tanaka Hiroshi',
    },
  };
  let app: INestApplication<App>;
  let conversationsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    conversationsService = {
      openWithUser: jest.fn().mockResolvedValue(conversationResponse),
      translate: jest.fn().mockResolvedValue({
        direction: 'vi-ja',
        translatedText: 'こんにちは',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [{ provide: ConversationsService, useValue: conversationsService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires x-user-id', () => {
    return request(app.getHttpServer())
      .post(`/conversations/with/${targetUserId}`)
      .expect(401);
  });

  it('opens an existing or new conversation with an accepted match', async () => {
    const response = await request(app.getHttpServer())
      .post(`/conversations/with/${targetUserId}`)
      .set('x-user-id', currentUserId)
      .expect(201);

    expect(response.body).toMatchObject(conversationResponse);
    expect(conversationsService.openWithUser).toHaveBeenCalledWith(currentUserId, targetUserId);
  });

  it('rejects messaging when users are not matched', () => {
    conversationsService.openWithUser.mockRejectedValueOnce(
      new ForbiddenException('メッセージを送るには、先にこのユーザーとマッチする必要があります。'),
    );

    return request(app.getHttpServer())
      .post(`/conversations/with/${targetUserId}`)
      .set('x-user-id', currentUserId)
      .expect(403);
  });

  it('requires x-user-id for translation', () => {
    return request(app.getHttpServer())
      .post('/conversations/translate')
      .send({ text: 'chào', direction: 'vi-ja' })
      .expect(401);
  });

  it('translates text for an authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .post('/conversations/translate')
      .set('x-user-id', currentUserId)
      .send({ text: 'chào', direction: 'vi-ja' })
      .expect(201);

    expect(response.body).toEqual({
      direction: 'vi-ja',
      translatedText: 'こんにちは',
    });
    expect(conversationsService.translate).toHaveBeenCalledWith(
      currentUserId,
      { text: 'chào', direction: 'vi-ja' },
    );
  });
});
