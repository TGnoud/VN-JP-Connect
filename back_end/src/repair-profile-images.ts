import 'dotenv/config';
import { MongoClient } from 'mongodb';

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
    const profiles = client.db(dbName).collection('profiles');
    const localUploadRegex = /^\/uploads\/profile\//;

    const avatarResult = await profiles.updateMany(
      { avatar_url: localUploadRegex },
      { $set: { avatar_url: '', updated_at: now } },
    );
    const coverResult = await profiles.updateMany(
      { cover_url: localUploadRegex },
      { $set: { cover_url: '', updated_at: now } },
    );
    const photosResult = await profiles.updateMany(
      { 'photos.url': localUploadRegex },
      {
        $pull: { photos: { url: localUploadRegex } } as any,
        $set: { updated_at: now },
      },
    );

    console.log(
      `Profile image repair complete for ${target}/${dbName}: ` +
        `avatar=${avatarResult.modifiedCount}, ` +
        `cover=${coverResult.modifiedCount}, ` +
        `photos=${photosResult.modifiedCount}`,
    );
  } finally {
    await client.close();
  }
}

void main();
