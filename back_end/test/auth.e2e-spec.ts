import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

describe('Auth API (e2e)', () => {
  const currentUserId = '507f1f77bcf86cd799439011';
  const lastSeenAt = new Date('2026-05-20T10:00:00.000Z');
  let app: INestApplication<App>;
  let authService: Record<string, jest.Mock>;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      updatePresence: jest.fn().mockResolvedValue({ ok: true, lastSeenAt }),
      logout: jest.fn().mockResolvedValue({ ok: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires x-user-id for presence heartbeat', () => {
    return request(app.getHttpServer()).post('/auth/presence').expect(401);
  });

  it('updates presence heartbeat', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/presence')
      .set('x-user-id', currentUserId)
      .expect(201);

    expect(response.body).toMatchObject({
      ok: true,
      lastSeenAt: lastSeenAt.toISOString(),
    });
    expect(authService.updatePresence).toHaveBeenCalledWith(currentUserId);
  });

  it('clears presence on logout', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('x-user-id', currentUserId)
      .expect(201);

    expect(response.body).toEqual({ ok: true });
    expect(authService.logout).toHaveBeenCalledWith(currentUserId);
  });
});
