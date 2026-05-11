import 'dotenv/config';
import { MongoClient } from 'mongodb';

const configuredMongoUri = process.env.MONGO_LOCAL_URI ?? process.env.MONGO_URI;

if (!configuredMongoUri) {
  throw new Error('Missing MONGO_LOCAL_URI or MONGO_URI in environment variables');
}

const mongoUri = configuredMongoUri;
const client = new MongoClient(mongoUri);

function assertLocalSeedTarget(uri: string) {
  const parsedUri = new URL(uri);
  const host = parsedUri.hostname;
  const databaseName = parsedUri.pathname.replace('/', '');
  const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  const isLocalDatabase = databaseName.endsWith('_local');

  if (!isLocalHost && !isLocalDatabase) {
    throw new Error(
      'Refusing to seed a shared database. Use localhost or a database name ending with _local.',
    );
  }
}

async function seed() {
  assertLocalSeedTarget(mongoUri);

  await client.connect();
  const db = client.db();

  await db.collection('users').deleteMany({});
  await db.collection('companies').deleteMany({});
  await db.collection('jobs').deleteMany({});

  const now = new Date();

  const users = await db.collection('users').insertMany([
    {
      email: 'admin@vn-jp-connect.local',
      name: 'Local Admin',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      email: 'student@vn-jp-connect.local',
      name: 'Nguyen Van A',
      role: 'student',
      japaneseLevel: 'N3',
      createdAt: now,
      updatedAt: now,
    },
    {
      email: 'recruiter@vn-jp-connect.local',
      name: 'Sato Recruiter',
      role: 'recruiter',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const companies = await db.collection('companies').insertMany([
    {
      name: 'Tokyo Tech Local',
      location: 'Tokyo, Japan',
      industry: 'Software',
      createdAt: now,
      updatedAt: now,
    },
    {
      name: 'Osaka Manufacturing Local',
      location: 'Osaka, Japan',
      industry: 'Manufacturing',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await db.collection('jobs').insertMany([
    {
      title: 'Backend Developer',
      companyId: companies.insertedIds[0],
      recruiterId: users.insertedIds[2],
      requiredJapaneseLevel: 'N3',
      location: 'Tokyo, Japan',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    },
    {
      title: 'Production Engineer',
      companyId: companies.insertedIds[1],
      recruiterId: users.insertedIds[2],
      requiredJapaneseLevel: 'N4',
      location: 'Osaka, Japan',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log('Seed data created successfully.');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
