import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HomeController } from '../src/home/home.controller';
import { HomeService } from '../src/home/home.service';

describe('Home API (e2e)', () => {
  const currentUserId = '507f1f77bcf86cd799439011';
  const targetUserId = '507f1f77bcf86cd799439012';
  let app: INestApplication<App>;
  let homeService: Record<string, jest.Mock>;

  beforeEach(async () => {
    homeService = {
      getFilterOptions: jest.fn().mockReturnValue({
        genders: ['male', 'female', 'other'],
        nationalities: ['VN', 'JP'],
        japaneseLevels: ['N5', 'N4', 'N3', 'N2', 'N1', 'Basic', 'Native'],
        interests: [],
        ageRange: { min: 18, max: 65, defaultMin: 18, defaultMax: 35 },
        distanceRange: { min: 0, max: 200, defaultMax: 50, supported: false },
      }),
      discover: jest.fn().mockResolvedValue([]),
      showInterest: jest.fn().mockResolvedValue({
        status: 'pending',
        matchId: '507f1f77bcf86cd799439013',
      }),
      getNavSummary: jest.fn().mockReturnValue({
        unreadMessagesCount: 0,
        unreadEventsCount: 0,
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [{ provide: HomeService, useValue: homeService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns home filter metadata', async () => {
    const response = await request(app.getHttpServer()).get('/home/filters').expect(200);

    expect(response.body).toMatchObject({
      japaneseLevels: ['N5', 'N4', 'N3', 'N2', 'N1', 'Basic', 'Native'],
      distanceRange: { supported: false },
    });
  });

  it('passes parsed discover query to service', async () => {
    await request(app.getHttpServer())
      .get('/home/discover')
      .query({
        gender: 'female',
        nationality: 'JP',
        ageMin: '20',
        ageMax: '30',
        distanceMax: '50',
        japaneseLevels: 'N3,N2',
        interestTagIds: '507f1f77bcf86cd799439014,507f1f77bcf86cd799439015',
        excludeUserIds: '507f1f77bcf86cd799439016',
        limit: '10',
      })
      .set('x-user-id', currentUserId)
      .expect(200);

    expect(homeService.discover).toHaveBeenCalledWith(
      currentUserId,
      expect.objectContaining({
        gender: 'female',
        nationality: 'JP',
        ageMin: 20,
        ageMax: 30,
        distanceMax: 50,
        japaneseLevels: ['N3', 'N2'],
        interestTagIds: ['507f1f77bcf86cd799439014', '507f1f77bcf86cd799439015'],
        excludeUserIds: ['507f1f77bcf86cd799439016'],
        limit: 10,
      }),
    );
  });

  it('creates or accepts interest for a discover user', async () => {
    await request(app.getHttpServer())
      .post(`/home/discover/${targetUserId}/interest`)
      .set('x-user-id', currentUserId)
      .expect(201);

    expect(homeService.showInterest).toHaveBeenCalledWith(currentUserId, targetUserId);
  });

  it('returns navigation summary', async () => {
    await request(app.getHttpServer())
      .get('/home/nav-summary')
      .set('x-user-id', currentUserId)
      .expect(200);

    expect(homeService.getNavSummary).toHaveBeenCalledWith(currentUserId);
  });
});
