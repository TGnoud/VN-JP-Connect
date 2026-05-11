import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { MAX_BIO_LENGTH } from './profile/profile.constants';

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
    const result = await profiles.updateMany(
      {
        bio: { $type: 'string' },
        $expr: { $gt: [{ $strLenCP: '$bio' }, MAX_BIO_LENGTH] },
      },
      [
        {
          $set: {
            bio: { $substrCP: ['$bio', 0, MAX_BIO_LENGTH] },
            updated_at: now,
          },
        },
      ] as any,
    );

    console.log(
      `Profile bio repair complete for ${target}/${dbName}: ` +
        `matched=${result.matchedCount}, modified=${result.modifiedCount}`,
    );
  } finally {
    await client.close();
  }
}

void main();
