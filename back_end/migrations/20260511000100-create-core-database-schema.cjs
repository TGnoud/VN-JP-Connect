const validators = {
  users: {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'email',
        'phone_number',
        'password_hash',
        'full_name',
        'nationality',
        'is_verified',
        'created_at',
      ],
      additionalProperties: true,
      properties: {
        email: { bsonType: 'string' },
        phone_number: { bsonType: 'string' },
        password_hash: { bsonType: 'string' },
        full_name: { bsonType: 'string' },
        nationality: { enum: ['JP', 'VN'] },
        is_verified: { bsonType: 'bool' },
        created_at: { bsonType: 'date' },
      },
    },
  },
  tags: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'type'],
      additionalProperties: true,
      properties: {
        name: { bsonType: 'string' },
        type: { enum: ['interest', 'purpose'] },
      },
    },
  },
  user_interests: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'tag_id'],
      additionalProperties: true,
      properties: {
        user_id: { bsonType: 'objectId' },
        tag_id: { bsonType: 'objectId' },
      },
    },
  },
  profiles: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'updated_at'],
      additionalProperties: true,
      properties: {
        user_id: { bsonType: 'objectId' },
        age: { bsonType: 'int', minimum: 0, maximum: 120 },
        gender: { enum: ['male', 'female', 'other', null] },
        location: { bsonType: 'string' },
        occupation: { bsonType: 'string' },
        education: { bsonType: 'string' },
        bio: { bsonType: 'string', maxLength: 300 },
        avatar_url: { bsonType: 'string' },
        cover_url: { bsonType: 'string' },
        social_links: {
          bsonType: 'object',
          additionalProperties: true,
          properties: {
            instagram: { bsonType: 'string' },
            facebook: { bsonType: 'string' },
            line: { bsonType: 'string' },
          },
        },
        languages: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['language', 'level'],
            additionalProperties: true,
            properties: {
              language: { bsonType: 'string' },
              level: { bsonType: 'string' },
            },
          },
        },
        photos: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['_id', 'url', 'is_main', 'uploaded_at'],
            additionalProperties: true,
            properties: {
              _id: { bsonType: 'objectId' },
              url: { bsonType: 'string' },
              is_main: { bsonType: 'bool' },
              uploaded_at: { bsonType: 'date' },
            },
          },
        },
        updated_at: { bsonType: 'date' },
      },
    },
  },
  matches: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['requester_id', 'receiver_id', 'status', 'created_at'],
      additionalProperties: true,
      properties: {
        requester_id: { bsonType: 'objectId' },
        receiver_id: { bsonType: 'objectId' },
        status: { enum: ['pending', 'accepted', 'rejected'] },
        created_at: { bsonType: 'date' },
      },
    },
  },
  conversations: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['match_id', 'created_at'],
      additionalProperties: true,
      properties: {
        match_id: { bsonType: 'objectId' },
        created_at: { bsonType: 'date' },
      },
    },
  },
  messages: {
    $jsonSchema: {
      bsonType: 'object',
      required: [
        'conversation_id',
        'sender_id',
        'content',
        'translated_content',
        'sent_at',
      ],
      additionalProperties: true,
      properties: {
        conversation_id: { bsonType: 'objectId' },
        sender_id: { bsonType: 'objectId' },
        content: { bsonType: 'string' },
        translated_content: { bsonType: 'string' },
        sent_at: { bsonType: 'date' },
      },
    },
  },
  events: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['organizer_id', 'title', 'event_date', 'location'],
      additionalProperties: true,
      properties: {
        organizer_id: { bsonType: 'objectId' },
        title: { bsonType: 'string' },
        event_date: { bsonType: 'date' },
        location: { bsonType: 'string' },
      },
    },
  },
  event_participants: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['event_id', 'user_id', 'joined_at'],
      additionalProperties: true,
      properties: {
        event_id: { bsonType: 'objectId' },
        user_id: { bsonType: 'objectId' },
        joined_at: { bsonType: 'date' },
      },
    },
  },
};

const managedIndexes = {
  users: [
    { key: { email: 1 }, options: { unique: true, name: 'users_email_unique' } },
  ],
  tags: [
    {
      key: { name: 1, type: 1 },
      options: { unique: true, name: 'tags_name_type_unique' },
    },
  ],
  user_interests: [
    {
      key: { user_id: 1, tag_id: 1 },
      options: { unique: true, name: 'user_interests_user_tag_unique' },
    },
    { key: { tag_id: 1 }, options: { name: 'user_interests_tag_id_idx' } },
  ],
  profiles: [
    {
      key: { user_id: 1 },
      options: { unique: true, name: 'profiles_user_id_unique' },
    },
  ],
  matches: [
    {
      key: { requester_id: 1, receiver_id: 1 },
      options: { unique: true, name: 'matches_requester_receiver_unique' },
    },
    { key: { receiver_id: 1 }, options: { name: 'matches_receiver_id_idx' } },
  ],
  conversations: [
    {
      key: { match_id: 1 },
      options: { unique: true, name: 'conversations_match_id_unique' },
    },
  ],
  messages: [
    {
      key: { conversation_id: 1, sent_at: 1 },
      options: { name: 'messages_conversation_sent_at_idx' },
    },
    { key: { sender_id: 1 }, options: { name: 'messages_sender_id_idx' } },
  ],
  events: [
    { key: { organizer_id: 1 }, options: { name: 'events_organizer_id_idx' } },
    { key: { event_date: 1 }, options: { name: 'events_event_date_idx' } },
  ],
  event_participants: [
    {
      key: { event_id: 1, user_id: 1 },
      options: { unique: true, name: 'event_participants_event_user_unique' },
    },
    {
      key: { user_id: 1 },
      options: { name: 'event_participants_user_id_idx' },
    },
  ],
};

async function ensureCollection(db, collectionName, validator) {
  const exists = await db
    .listCollections({ name: collectionName }, { nameOnly: true })
    .hasNext();

  if (!exists) {
    await db.createCollection(collectionName, {
      validator,
      validationLevel: 'moderate',
      validationAction: 'error',
    });
    return;
  }

  await db.command({
    collMod: collectionName,
    validator,
    validationLevel: 'moderate',
    validationAction: 'error',
  });
}

async function createManagedIndexes(db) {
  for (const [collectionName, indexes] of Object.entries(managedIndexes)) {
    const collection = db.collection(collectionName);

    for (const index of indexes) {
      await collection.createIndex(index.key, index.options);
    }
  }
}

async function dropIndexIfExists(db, collectionName, indexName) {
  try {
    await db.collection(collectionName).dropIndex(indexName);
  } catch (error) {
    if (error.codeName !== 'IndexNotFound' && error.code !== 27) {
      throw error;
    }
  }
}

module.exports = {
  async up(db) {
    for (const [collectionName, validator] of Object.entries(validators)) {
      await ensureCollection(db, collectionName, validator);
    }

    await createManagedIndexes(db);
  },

  async down(db) {
    if (process.env.DB_MIGRATION_TARGET !== 'local') {
      throw new Error('Refusing to rollback schema migration outside local database.');
    }

    for (const [collectionName, indexes] of Object.entries(managedIndexes)) {
      for (const index of indexes) {
        await dropIndexIfExists(db, collectionName, index.options.name);
      }
    }

    for (const collectionName of Object.keys(validators)) {
      await db.command({
        collMod: collectionName,
        validator: {},
        validationLevel: 'off',
      });
    }
  },
};
