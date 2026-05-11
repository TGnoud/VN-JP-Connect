import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ProfileController,
  ProfileOptionsController,
  TagsController,
} from './../src/profile/profile.controller';
import { ProfileService } from './../src/profile/profile.service';

describe('Profile API (e2e)', () => {
  const userId = '507f1f77bcf86cd799439011';
  const tagId = '507f1f77bcf86cd799439012';
  const photoId = '507f1f77bcf86cd799439013';
  const profileResponse = {
    id: userId,
    fullName: 'Nguyen Van Minh',
    email: 'minh@example.com',
    interests: [],
    photos: [],
  };
  let app: INestApplication<App>;
  let profileService: Record<string, jest.Mock>;

  beforeEach(async () => {
    profileService = {
      getMe: jest.fn().mockResolvedValue(profileResponse),
      updatePersonal: jest.fn().mockResolvedValue(profileResponse),
      updateBio: jest.fn().mockResolvedValue(profileResponse),
      replaceLanguages: jest.fn().mockResolvedValue(profileResponse),
      replaceInterests: jest.fn().mockResolvedValue(profileResponse),
      addPhotos: jest.fn().mockResolvedValue(profileResponse),
      addPhotoUrls: jest.fn().mockResolvedValue(profileResponse),
      deletePhoto: jest.fn().mockResolvedValue(profileResponse),
      updateAvatar: jest.fn().mockResolvedValue(profileResponse),
      updateAvatarUrl: jest.fn().mockResolvedValue(profileResponse),
      updateCover: jest.fn().mockResolvedValue(profileResponse),
      updateCoverUrl: jest.fn().mockResolvedValue(profileResponse),
      getProfileOptions: jest.fn().mockReturnValue({ genders: ['male'] }),
      searchTags: jest.fn().mockResolvedValue([{ id: tagId, name: 'Anime' }]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController, ProfileOptionsController, TagsController],
      providers: [{ provide: ProfileService, useValue: profileService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires x-user-id for my profile endpoints', () => {
    return request(app.getHttpServer()).get('/profiles/me').expect(401);
  });

  it('rejects invalid x-user-id', () => {
    return request(app.getHttpServer())
      .get('/profiles/me')
      .set('x-user-id', 'invalid')
      .expect(400);
  });

  it('returns my profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/profiles/me')
      .set('x-user-id', userId)
      .expect(200);

    expect(response.body).toMatchObject(profileResponse);
    expect(profileService.getMe).toHaveBeenCalledWith(userId);
  });

  it('updates personal information', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me/personal')
      .set('x-user-id', userId)
      .send({
        fullName: 'Nguyen Van Minh',
        email: 'minh@example.com',
        age: 26,
        gender: 'male',
        nationality: 'VN',
      })
      .expect(200);

    expect(profileService.updatePersonal).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ email: 'minh@example.com', age: 26 }),
    );
  });

  it('rejects invalid personal information', () => {
    return request(app.getHttpServer())
      .patch('/profiles/me/personal')
      .set('x-user-id', userId)
      .send({ email: 'not-email' })
      .expect(400);
  });

  it('updates bio and rejects over-limit bio', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me/bio')
      .set('x-user-id', userId)
      .send({ bio: 'hello' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/profiles/me/bio')
      .set('x-user-id', userId)
      .send({ bio: 'a'.repeat(301) })
      .expect(400);
  });

  it('replaces languages and rejects duplicates', async () => {
    await request(app.getHttpServer())
      .put('/profiles/me/languages')
      .set('x-user-id', userId)
      .send({ languages: [{ language: 'Japanese', level: 'N3' }] })
      .expect(200);

    await request(app.getHttpServer())
      .put('/profiles/me/languages')
      .set('x-user-id', userId)
      .send({
        languages: [
          { language: 'Japanese', level: 'N3' },
          { language: 'Japanese', level: 'N2' },
        ],
      })
      .expect(400);
  });

  it('replaces interests and rejects invalid tag IDs', async () => {
    await request(app.getHttpServer())
      .put('/profiles/me/interests')
      .set('x-user-id', userId)
      .send({ tagIds: [tagId] })
      .expect(200);

    await request(app.getHttpServer())
      .put('/profiles/me/interests')
      .set('x-user-id', userId)
      .send({ tagIds: ['bad-id'] })
      .expect(400);
  });

  it('uploads and deletes profile photos', async () => {
    await request(app.getHttpServer())
      .post('/profiles/me/photos')
      .set('x-user-id', userId)
      .attach('files', Buffer.from('image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(profileService.addPhotos).toHaveBeenCalledWith(
      userId,
      expect.arrayContaining([expect.objectContaining({ mimetype: 'image/jpeg' })]),
    );

    await request(app.getHttpServer())
      .delete(`/profiles/me/photos/${photoId}`)
      .set('x-user-id', userId)
      .expect(200);
  });

  it('adds profile photos from preset URLs', async () => {
    await request(app.getHttpServer())
      .post('/profiles/me/photos-url')
      .set('x-user-id', userId)
      .send({ urls: ['https://images.unsplash.com/photo.jpg'] })
      .expect(201);

    expect(profileService.addPhotoUrls).toHaveBeenCalledWith(userId, [
      'https://images.unsplash.com/photo.jpg',
    ]);
  });

  it('rejects invalid photo upload type', () => {
    return request(app.getHttpServer())
      .post('/profiles/me/photos')
      .set('x-user-id', userId)
      .attach('files', Buffer.from('text'), {
        filename: 'photo.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('updates avatar and cover', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me/avatar')
      .set('x-user-id', userId)
      .attach('file', Buffer.from('image'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/profiles/me/cover')
      .set('x-user-id', userId)
      .attach('file', Buffer.from('image'), {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);
  });

  it('updates avatar and cover from preset URLs', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me/avatar-url')
      .set('x-user-id', userId)
      .send({ url: 'https://api.dicebear.com/7.x/personas/svg?seed=minh' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/profiles/me/cover-url')
      .set('x-user-id', userId)
      .send({ url: 'https://images.unsplash.com/photo.jpg' })
      .expect(200);

    expect(profileService.updateAvatarUrl).toHaveBeenCalled();
    expect(profileService.updateCoverUrl).toHaveBeenCalled();
  });

  it('returns profile options and searches tags', async () => {
    await request(app.getHttpServer()).get('/profile-options').expect(200);
    await request(app.getHttpServer())
      .get('/tags?type=interest&q=anime')
      .expect(200);
  });
});
