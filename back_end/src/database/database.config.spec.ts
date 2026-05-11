import { resolveMongoConfig } from './database.config';

describe('resolveMongoConfig', () => {
  it('defaults to local database target', () => {
    expect(
      resolveMongoConfig({
        MONGO_LOCAL_URI: 'mongodb://localhost:27017/vn_jp_connect_local',
        MONGO_LOCAL_DATABASE_NAME: 'vn_jp_connect_local',
        MONGO_URI: 'mongodb+srv://example.mongodb.net',
        MONGO_ATLAS_DATABASE_NAME: 'vn_jp_connect',
      }),
    ).toEqual({
      target: 'local',
      uri: 'mongodb://localhost:27017/vn_jp_connect_local',
      dbName: 'vn_jp_connect_local',
    });
  });

  it('uses Atlas only when DB_TARGET is atlas', () => {
    expect(
      resolveMongoConfig({
        DB_TARGET: 'atlas',
        MONGO_LOCAL_URI: 'mongodb://localhost:27017/vn_jp_connect_local',
        MONGO_LOCAL_DATABASE_NAME: 'vn_jp_connect_local',
        MONGO_URI: 'mongodb+srv://example.mongodb.net',
        MONGO_ATLAS_DATABASE_NAME: 'vn_jp_connect',
      }),
    ).toEqual({
      target: 'atlas',
      uri: 'mongodb+srv://example.mongodb.net',
      dbName: 'vn_jp_connect',
    });
  });

  it('fails when Atlas target is missing its database name', () => {
    expect(() =>
      resolveMongoConfig({
        DB_TARGET: 'atlas',
        MONGO_URI: 'mongodb+srv://example.mongodb.net',
      }),
    ).toThrow('Missing MONGO_ATLAS_DATABASE_NAME for DB_TARGET=atlas.');
  });

  it('fails when DB_TARGET is not supported', () => {
    expect(() =>
      resolveMongoConfig({
        DB_TARGET: 'staging',
        MONGO_LOCAL_URI: 'mongodb://localhost:27017/vn_jp_connect_local',
        MONGO_LOCAL_DATABASE_NAME: 'vn_jp_connect_local',
      }),
    ).toThrow('Invalid DB_TARGET "staging". Expected "local" or "atlas".');
  });
});
