import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { DEFAULT_LEGACY_AGE } from './common/age';

const target = process.argv.includes('--atlas') ? 'atlas' : 'local';
const configuredMongoUri =
  target === 'atlas'
    ? process.env.MONGO_ATLAS_URI ?? process.env.MONGO_URI
    : process.env.MONGO_LOCAL_URI;

if (!configuredMongoUri) {
  throw new Error(
    `Missing ${target === 'atlas' ? 'MONGO_ATLAS_URI or MONGO_URI' : 'MONGO_LOCAL_URI'}`,
  );
}

const mongoUri = configuredMongoUri;

function databaseNameFromUri(uri: string) {
  const parsedUri = new URL(uri);
  return parsedUri.pathname.replace(/^\//, '') || undefined;
}

function databaseName(uri: string) {
  return target === 'atlas'
    ? (process.env.MONGO_ATLAS_DATABASE_NAME ?? databaseNameFromUri(uri))
    : (process.env.MONGO_LOCAL_DATABASE_NAME ?? databaseNameFromUri(uri));
}

function assertTarget(uri: string) {
  const parsedUri = new URL(uri);
  const host = parsedUri.hostname;
  const dbName = databaseName(uri);
  const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  const isLocalDatabase = dbName?.endsWith('_local') ?? false;

  if (!dbName) {
    throw new Error('Missing database name in URI or environment variables.');
  }

  if (target === 'local' && !isLocalHost && !isLocalDatabase) {
    throw new Error('Refusing to repair a shared database without --atlas.');
  }

  if (target === 'atlas' && (isLocalHost || isLocalDatabase)) {
    throw new Error('Refusing to run Atlas repair against a local database.');
  }

  return dbName;
}

async function main() {
  const dbName = assertTarget(mongoUri);
  const client = new MongoClient(mongoUri);
  const now = new Date();

  await client.connect();

  try {
    const db = client.db(dbName);
    const users = db.collection('users');
    const profiles = db.collection('profiles');

    const legacyUsers = await users
      .find({ $or: [{ birth_date: { $exists: false } }, { birth_date: null }] })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();
    const legacyUserIds = legacyUsers.map((user) => user._id);

    if (legacyUserIds.length === 0) {
      console.log(`Legacy age repair complete for ${target}/${dbName}: users=0, updated=0, inserted=0`);
      return;
    }

    const updateResult = await profiles.updateMany(
      {
        user_id: { $in: legacyUserIds },
        $or: [{ age: { $exists: false } }, { age: null }],
      },
      { $set: { age: DEFAULT_LEGACY_AGE, updated_at: now } },
    );

    const existingProfileUserIds = await profiles
      .distinct('user_id', { user_id: { $in: legacyUserIds } });
    const existingIdSet = new Set(existingProfileUserIds.map((id) => id.toString()));
    const missingProfileUserIds = legacyUserIds.filter((id) => !existingIdSet.has(id.toString()));

    if (missingProfileUserIds.length > 0) {
      await profiles.insertMany(
        missingProfileUserIds.map((userId) => ({
          user_id: userId,
          age: DEFAULT_LEGACY_AGE,
          location: '',
          occupation: '',
          education: '',
          bio: '',
          avatar_url: '',
          cover_url: '',
          social_links: { instagram: '', facebook: '', line: '' },
          languages: [],
          photos: [],
          updated_at: now,
        })),
        { ordered: false },
      );
    }

    console.log(
      `Legacy age repair complete for ${target}/${dbName}: ` +
        `users=${legacyUserIds.length}, ` +
        `updated=${updateResult.modifiedCount}, ` +
        `inserted=${missingProfileUserIds.length}`,
    );
  } finally {
    await client.close();
  }
}

void main();
