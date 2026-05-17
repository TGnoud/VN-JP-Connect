import 'dotenv/config';
import { Collection, Db, Document, Filter, MongoClient, ObjectId } from 'mongodb';

const seedTarget = process.argv.includes('--atlas') ? 'atlas' : 'local';
const configuredMongoUri =
  seedTarget === 'atlas'
    ? process.env.MONGO_ATLAS_URI ?? process.env.MONGO_URI
    : process.env.MONGO_LOCAL_URI;

if (!configuredMongoUri) {
  throw new Error(
    `Missing ${
      seedTarget === 'atlas' ? 'MONGO_ATLAS_URI or MONGO_URI' : 'MONGO_LOCAL_URI'
    } in environment variables`,
  );
}

const mongoUri = configuredMongoUri;

function databaseNameFromUri(uri: string) {
  const parsedUri = new URL(uri);
  const databaseName = parsedUri.pathname.replace(/^\//, '');
  return databaseName || undefined;
}

function assertSeedTarget(uri: string) {
  const parsedUri = new URL(uri);
  const host = parsedUri.hostname;
  const databaseName =
    seedTarget === 'atlas'
      ? (process.env.MONGO_ATLAS_DATABASE_NAME ?? databaseNameFromUri(uri))
      : (process.env.MONGO_LOCAL_DATABASE_NAME ?? databaseNameFromUri(uri));
  const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(host);
  const isLocalDatabase = databaseName?.endsWith('_local') ?? false;

  if (!databaseName) {
    throw new Error(
      'Missing local database name. Add it to MONGO_LOCAL_URI or set MONGO_LOCAL_DATABASE_NAME.',
    );
  }

  if (seedTarget === 'local' && !isLocalHost && !isLocalDatabase) {
    throw new Error(
      'Refusing to seed a shared database. Use localhost or a database name ending with _local.',
    );
  }

  if (seedTarget === 'atlas' && (isLocalHost || isLocalDatabase)) {
    throw new Error('Refusing to run Atlas seed against a local database.');
  }

  return databaseName;
}

async function upsertAndGetId(
  collection: Collection<Document>,
  filter: Filter<Document>,
  set: Document,
  setOnInsert: Document = {},
) {
  await collection.updateOne(
    filter,
    {
      $set: set,
      $setOnInsert: setOnInsert,
    },
    { upsert: true },
  );

  const document = await collection.findOne(filter);

  if (!document?._id) {
    throw new Error(`Seed document was not found in ${collection.collectionName}`);
  }

  return document._id;
}

async function seedUsers(db: Db, now: Date) {
  const users = db.collection('users');

  const adminId = await upsertAndGetId(
    users,
    { email: 'admin@vn-jp-connect.local' },
    {
      email: 'admin@vn-jp-connect.local',
      phone_number: '+84900000001',
      password_hash: 'local-seed-password-hash',
      full_name: 'Local Admin',
      nationality: 'VN',
      birth_date: new Date('1990-01-01T00:00:00.000Z'),
      is_verified: true,
      created_at: now,
    },
  );

  const vnStudentId = await upsertAndGetId(
    users,
    { phone_number: '+84900000002' },
    {
      email: 'minh.nguyen@example.com',
      phone_number: '+84900000002',
      password_hash: 'local-seed-password-hash',
      full_name: 'Nguyen Van Minh',
      nationality: 'VN',
      birth_date: new Date('1999-05-12T00:00:00.000Z'),
      is_verified: true,
      created_at: new Date('2024-06-01T00:00:00.000Z'),
    },
  );

  const jpStudentId = await upsertAndGetId(
    users,
    { email: 'student.jp@vn-jp-connect.local' },
    {
      email: 'student.jp@vn-jp-connect.local',
      phone_number: '+819000000003',
      password_hash: 'local-seed-password-hash',
      full_name: 'Sato Hanako',
      nationality: 'JP',
      birth_date: new Date('2001-05-12T00:00:00.000Z'),
      is_verified: true,
      created_at: now,
    },
  );

  const organizerId = await upsertAndGetId(
    users,
    { email: 'organizer@vn-jp-connect.local' },
    {
      email: 'organizer@vn-jp-connect.local',
      phone_number: '+84900000004',
      password_hash: 'local-seed-password-hash',
      full_name: 'Tran Event Organizer',
      nationality: 'VN',
      birth_date: new Date('1995-05-12T00:00:00.000Z'),
      is_verified: true,
      created_at: now,
    },
  );

  return { adminId, vnStudentId, jpStudentId, organizerId };
}

async function seedTags(db: Db) {
  const tags = db.collection('tags');

  const languageExchangeId = await upsertAndGetId(tags, {
    name: 'Language Exchange',
    type: 'interest',
  }, {
    name: 'Language Exchange',
    type: 'interest',
  });

  const jobHuntingId = await upsertAndGetId(tags, {
    name: 'Job Hunting',
    type: 'purpose',
  }, {
    name: 'Job Hunting',
    type: 'purpose',
  });

  const cultureId = await upsertAndGetId(tags, {
    name: 'Culture',
    type: 'interest',
  }, {
    name: 'Culture',
    type: 'interest',
  });

  const studyAbroadId = await upsertAndGetId(tags, {
    name: 'Study Abroad',
    type: 'purpose',
  }, {
    name: 'Study Abroad',
    type: 'purpose',
  });

  const profileInterestNames = [
    '言語交換',
    'アニメ',
    'テクノロジー',
    'ベトナム料理',
    '旅行',
    '写真',
    'コーヒー',
    '読書',
    'マンガ',
    'J-POP',
    'K-POP',
    'ゲーム',
    'サッカー',
    '映画',
    '音楽',
    'ダンス',
    'ファッション',
    '料理',
    'ヨガ',
    'ランニング',
    '書道',
    '茶道',
    '剣道',
    '柔道',
    'カラオケ',
    'ボランティア',
    'バイク',
    'ハイキング',
    'アウトドア',
    '料理教室',
  ];
  const profileInterestIds: ObjectId[] = [];

  for (const name of profileInterestNames) {
    const tagId = await upsertAndGetId(
      tags,
      { name, type: 'interest' },
      { name, type: 'interest' },
    );
    profileInterestIds.push(tagId);
  }

  return {
    languageExchangeId,
    jobHuntingId,
    cultureId,
    studyAbroadId,
    profileInterestIds,
  };
}

async function seedProfiles(
  db: Db,
  users: {
    vnStudentId: ObjectId;
    jpStudentId: ObjectId;
    organizerId: ObjectId;
  },
  now: Date,
) {
  const profiles = db.collection('profiles');

  await upsertAndGetId(
    profiles,
    { user_id: users.vnStudentId },
    {
      user_id: users.vnStudentId,
      age: 26,
      gender: 'male',
      location: 'ハノイ市, ベトナム',
      occupation: 'ソフトウェア開発者',
      education: 'ハノイ工科大学',
      bio: 'ハノイ出身のソフトウェア開発者です。日本語を勉強して2年になります。日本の文化、特にアニメ、料理、テクノロジーに深い興味があります。言語交換パートナーを探しています。一緒に楽しく学びましょう！',
      avatar_url: 'https://api.dicebear.com/7.x/personas/svg?seed=minh',
      cover_url: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1400&q=90',
      social_links: {
        instagram: '@minh_nguyen_vn',
        facebook: 'Minh Nguyen',
        line: '@minh_line',
      },
      languages: [
        { language: 'Vietnamese', level: 'Native' },
        { language: 'Japanese', level: 'N3' },
        { language: 'English', level: 'IELTS 7.0' },
      ],
      photos: [
        {
          _id: new ObjectId(),
          url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=700&q=90',
          is_main: true,
          uploaded_at: now,
        },
        {
          _id: new ObjectId(),
          url: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=700&q=90',
          is_main: false,
          uploaded_at: now,
        },
        {
          _id: new ObjectId(),
          url: 'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=700&q=90',
          is_main: false,
          uploaded_at: now,
        },
      ],
      match_rate: 94,
      connections_count: 128,
      updated_at: now,
    },
  );

  await upsertAndGetId(
    profiles,
    { user_id: users.jpStudentId },
    {
      user_id: users.jpStudentId,
      age: 24,
      gender: 'female',
      location: 'Tokyo, Japan',
      occupation: 'Teacher',
      education: 'Tokyo University',
      bio: 'I am studying Vietnamese and want to meet friends interested in culture exchange.',
      avatar_url: 'https://api.dicebear.com/7.x/personas/svg?seed=hanako',
      cover_url: '',
      social_links: { instagram: '', facebook: '', line: '' },
      languages: [
        { language: 'Japanese', level: 'Native' },
        { language: 'Vietnamese', level: 'Beginner' },
      ],
      photos: [],
      updated_at: now,
    },
  );

  await upsertAndGetId(
    profiles,
    { user_id: users.organizerId },
    {
      user_id: users.organizerId,
      age: 30,
      gender: 'other',
      location: 'Ho Chi Minh City, Viet Nam',
      occupation: 'Event Organizer',
      education: '',
      bio: 'I organize VN-JP exchange events and help members find useful connections.',
      avatar_url: '',
      cover_url: '',
      social_links: { instagram: '', facebook: '', line: '' },
      languages: [
        { language: 'Vietnamese', level: 'Native' },
        { language: 'Japanese', level: 'N2' },
      ],
      photos: [],
      updated_at: now,
    },
  );
}

async function seedUserInterests(
  db: Db,
  pairs: Array<{ user_id: ObjectId; tag_id: ObjectId }>,
) {
  const userInterests = db.collection('user_interests');
  const userIds = [
    ...new Set(pairs.map((pair) => pair.user_id.toHexString())),
  ].map((id) => new ObjectId(id));

  if (userIds.length > 0) {
    await userInterests.deleteMany({ user_id: { $in: userIds } });
  }

  for (const pair of pairs) {
    await upsertAndGetId(userInterests, pair, pair);
  }
}

async function seedMatches(
  db: Db,
  requesterId: ObjectId,
  receiverId: ObjectId,
  organizerId: ObjectId,
  now: Date,
) {
  const matches = db.collection('matches');

  const acceptedMatchId = await upsertAndGetId(
    matches,
    { requester_id: requesterId, receiver_id: receiverId },
    {
      requester_id: requesterId,
      receiver_id: receiverId,
      status: 'accepted',
      created_at: now,
    },
  );

  const pendingMatchId = await upsertAndGetId(
    matches,
    { requester_id: requesterId, receiver_id: organizerId },
    {
      requester_id: requesterId,
      receiver_id: organizerId,
      status: 'pending',
      created_at: now,
    },
  );

  return { acceptedMatchId, pendingMatchId };
}

async function seedConversation(
  db: Db,
  matchId: ObjectId,
  participantIds: ObjectId[],
  now: Date,
) {
  return upsertAndGetId(
    db.collection('conversations'),
    { match_id: matchId },
    {
      match_id: matchId,
      type: 'direct',
      title: '',
      participant_ids: participantIds,
      created_at: now,
      updated_at: now,
      last_message_at: now,
    },
  );
}

async function seedMessages(
  db: Db,
  conversationId: ObjectId,
  vnStudentId: ObjectId,
  jpStudentId: ObjectId,
) {
  const messages = db.collection('messages');

  await upsertAndGetId(
    messages,
    { seed_key: 'local-message-hello-vn' },
    {
      seed_key: 'local-message-hello-vn',
      conversation_id: conversationId,
      sender_id: vnStudentId,
      content: 'Xin chao, minh muon luyen tieng Nhat.',
      translated_content: 'こんにちは、日本語を練習したいです。',
      message_type: 'text',
      status: 'read',
      read_by: [vnStudentId, jpStudentId],
      attachments: [],
      sent_at: new Date('2026-05-11T02:00:00.000Z'),
    },
  );

  await upsertAndGetId(
    messages,
    { seed_key: 'local-message-hello-jp' },
    {
      seed_key: 'local-message-hello-jp',
      conversation_id: conversationId,
      sender_id: jpStudentId,
      content: 'こんにちは。ベトナム語も勉強しています。',
      translated_content: 'Xin chao. Minh cung dang hoc tieng Viet.',
      message_type: 'text',
      status: 'sent',
      read_by: [jpStudentId],
      attachments: [],
      sent_at: new Date('2026-05-11T02:05:00.000Z'),
    },
  );
}

async function seedEvent(db: Db, organizerId: ObjectId, now: Date) {
  return upsertAndGetId(
    db.collection('events'),
    { seed_key: 'local-event-language-exchange' },
    {
      seed_key: 'local-event-language-exchange',
      organizer_id: organizerId,
      title: 'VN-JP Local Language Exchange',
      description: 'Local language exchange event for Vietnamese and Japanese learners.',
      category: 'Language Exchange',
      language: 'Japanese-Vietnamese',
      format: 'in-person',
      event_date: new Date('2026-06-01T10:00:00.000Z'),
      start_date: '2026-06-01',
      start_time: '10:00',
      end_date: '2026-06-01',
      end_time: '12:00',
      location: 'Ho Chi Minh City',
      online_url: '',
      capacity: 40,
      current_participants: 0,
      cover_image_url: '',
      status: 'published',
      created_at: now,
      updated_at: now,
    },
  );
}

async function seedEventParticipants(
  db: Db,
  eventId: ObjectId,
  userIds: ObjectId[],
  now: Date,
) {
  const eventParticipants = db.collection('event_participants');

  for (const userId of userIds) {
    await upsertAndGetId(
      eventParticipants,
      { event_id: eventId, user_id: userId },
      { event_id: eventId, user_id: userId, joined_at: now },
    );
  }
}

async function seed() {
  const databaseName = assertSeedTarget(mongoUri);
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();

    const db = client.db(databaseName);
    const now = new Date();
    const users = await seedUsers(db, now);
    const tags = await seedTags(db);
    await seedProfiles(db, users, now);

    await seedUserInterests(db, [
      ...tags.profileInterestIds.slice(0, 8).map((tag_id) => ({
        user_id: users.vnStudentId,
        tag_id,
      })),
      { user_id: users.jpStudentId, tag_id: tags.languageExchangeId },
      { user_id: users.jpStudentId, tag_id: tags.cultureId },
      { user_id: users.organizerId, tag_id: tags.studyAbroadId },
    ]);

    const { acceptedMatchId } = await seedMatches(
      db,
      users.vnStudentId,
      users.jpStudentId,
      users.organizerId,
      now,
    );
    const conversationId = await seedConversation(
      db,
      acceptedMatchId,
      [users.vnStudentId, users.jpStudentId],
      now,
    );

    await seedMessages(
      db,
      conversationId,
      users.vnStudentId,
      users.jpStudentId,
    );

    const eventId = await seedEvent(db, users.organizerId, now);

    await seedEventParticipants(
      db,
      eventId,
      [users.organizerId, users.vnStudentId, users.jpStudentId],
      now,
    );

    console.log(`${seedTarget} seed data created successfully.`);
    console.log(`NEXT_PUBLIC_DEV_USER_ID=${users.vnStudentId.toHexString()}`);
  } finally {
    await client.close();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
