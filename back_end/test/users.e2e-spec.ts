import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('Users API (e2e)', () => {
  const currentUserId = '507f1f77bcf86cd799439011';
  const targetUserId = '507f1f77bcf86cd799439012';
  const publicProfileResponse = {
    id: targetUserId,
    fullName: 'Tanaka Hiroshi',
    nationality: 'JP',
    languages: [],
    interests: [],
    photos: [],
  };
  let app: INestApplication<App>;
  let usersService: Record<string, jest.Mock>;

  beforeEach(async () => {
    usersService = {
      getPublicProfile: jest.fn().mockResolvedValue(publicProfileResponse),
      reportUser: jest.fn().mockResolvedValue({
        id: '507f1f77bcf86cd799439013',
        status: 'pending',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires x-user-id for public profile', () => {
    return request(app.getHttpServer())
      .get(`/users/${targetUserId}/profile`)
      .expect(401);
  });

  it('returns public profile', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${targetUserId}/profile`)
      .set('x-user-id', currentUserId)
      .expect(200);

    expect(response.body).toMatchObject(publicProfileResponse);
    expect(usersService.getPublicProfile).toHaveBeenCalledWith(currentUserId, targetUserId);
  });

  it('rejects missing report reason', () => {
    return request(app.getHttpServer())
      .post(`/users/${targetUserId}/report`)
      .set('x-user-id', currentUserId)
      .field('detail', 'details')
      .expect(400);
  });

  it('rejects invalid report evidence type', () => {
    return request(app.getHttpServer())
      .post(`/users/${targetUserId}/report`)
      .set('x-user-id', currentUserId)
      .field('reason', 'spam')
      .attach('evidence', Buffer.from('text'), {
        filename: 'evidence.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('creates user report with evidence', async () => {
    await request(app.getHttpServer())
      .post(`/users/${targetUserId}/report`)
      .set('x-user-id', currentUserId)
      .field('reason', 'spam')
      .field('detail', 'details')
      .attach('evidence', Buffer.from('image'), {
        filename: 'evidence.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(usersService.reportUser).toHaveBeenCalledWith(
      currentUserId,
      targetUserId,
      { reason: 'spam', detail: 'details' },
      expect.arrayContaining([expect.objectContaining({ mimetype: 'image/png' })]),
    );
  });

  it('passes service errors through', () => {
    usersService.getPublicProfile.mockRejectedValueOnce(new BadRequestException('bad user'));

    return request(app.getHttpServer())
      .get(`/users/${targetUserId}/profile`)
      .set('x-user-id', currentUserId)
      .expect(400);
  });
});
