const conversationValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['type', 'participant_ids', 'created_at', 'updated_at'],
    additionalProperties: true,
    properties: {
      match_id: { bsonType: ['objectId', 'null'] },
      type: { enum: ['direct', 'group'] },
      title: { bsonType: 'string', maxLength: 50 },
      created_by: { bsonType: ['objectId', 'null'] },
      participant_ids: {
        bsonType: 'array',
        items: { bsonType: 'objectId' },
      },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
      last_message_at: { bsonType: ['date', 'null'] },
    },
  },
};

const messageValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'conversation_id',
      'sender_id',
      'content',
      'translated_content',
      'message_type',
      'status',
      'read_by',
      'sent_at',
    ],
    additionalProperties: true,
    properties: {
      conversation_id: { bsonType: 'objectId' },
      sender_id: { bsonType: 'objectId' },
      content: { bsonType: 'string' },
      translated_content: { bsonType: 'string' },
      message_type: { enum: ['text', 'file', 'media', 'voice', 'system'] },
      status: { enum: ['sent', 'read'] },
      read_by: {
        bsonType: 'array',
        items: { bsonType: 'objectId' },
      },
      attachments: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['url'],
          additionalProperties: true,
          properties: {
            url: { bsonType: 'string' },
            file_name: { bsonType: 'string' },
            mime_type: { bsonType: 'string' },
            size: { bsonType: ['int', 'long', 'double'] },
          },
        },
      },
      sent_at: { bsonType: 'date' },
    },
  },
};

const conversationFeedbackValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['conversation_id', 'reviewer_id', 'target_user_id', 'value', 'created_at'],
    additionalProperties: true,
    properties: {
      conversation_id: { bsonType: 'objectId' },
      reviewer_id: { bsonType: 'objectId' },
      target_user_id: { bsonType: 'objectId' },
      value: { enum: ['liked', 'skipped'] },
      created_at: { bsonType: 'date' },
    },
  },
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
    const now = new Date();

    await db.collection('conversations').updateMany(
      { type: { $exists: false } },
      {
        $set: {
          type: 'direct',
          title: '',
          participant_ids: [],
          updated_at: now,
          last_message_at: now,
        },
      },
    );

    await db.collection('messages').updateMany(
      { message_type: { $exists: false } },
      {
        $set: {
          message_type: 'text',
          status: 'sent',
          read_by: [],
          attachments: [],
        },
      },
    );

    await ensureCollection(db, 'conversations', conversationValidator);
    await ensureCollection(db, 'messages', messageValidator);
    await ensureCollection(db, 'conversation_feedbacks', conversationFeedbackValidator);

    await dropIndexIfExists(db, 'conversations', 'conversations_match_id_unique');
    await db.collection('conversations').createIndex(
      { match_id: 1 },
      {
        unique: true,
        name: 'conversations_match_id_unique',
        partialFilterExpression: { match_id: { $type: 'objectId' } },
      },
    );
    await db.collection('conversations').createIndex(
      { participant_ids: 1, last_message_at: -1 },
      { name: 'conversations_participant_last_message_idx' },
    );
    await db.collection('messages').createIndex(
      { conversation_id: 1, sender_id: 1, read_by: 1 },
      { name: 'messages_unread_lookup_idx' },
    );
    await db.collection('conversation_feedbacks').createIndex(
      { conversation_id: 1, reviewer_id: 1 },
      {
        unique: true,
        name: 'conversation_feedbacks_conversation_reviewer_unique',
      },
    );
    await db.collection('conversation_feedbacks').createIndex(
      { target_user_id: 1, value: 1 },
      { name: 'conversation_feedbacks_target_value_idx' },
    );
  },

  async down(db) {
    if (process.env.DB_MIGRATION_TARGET !== 'local') {
      throw new Error('Refusing to rollback schema migration outside local database.');
    }

    await dropIndexIfExists(db, 'conversation_feedbacks', 'conversation_feedbacks_target_value_idx');
    await dropIndexIfExists(
      db,
      'conversation_feedbacks',
      'conversation_feedbacks_conversation_reviewer_unique',
    );
    await dropIndexIfExists(db, 'messages', 'messages_unread_lookup_idx');
    await dropIndexIfExists(db, 'conversations', 'conversations_participant_last_message_idx');
    await dropIndexIfExists(db, 'conversations', 'conversations_match_id_unique');
    await db.collection('conversations').createIndex(
      { match_id: 1 },
      { unique: true, name: 'conversations_match_id_unique' },
    );

    await db.command({
      collMod: 'conversation_feedbacks',
      validator: {},
      validationLevel: 'off',
    });
  },
};
