const eventValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'organizer_id',
      'title',
      'event_date',
      'location',
      'format',
      'status',
      'created_at',
      'updated_at',
    ],
    additionalProperties: true,
    properties: {
      organizer_id: { bsonType: 'objectId' },
      title: { bsonType: 'string' },
      description: { bsonType: 'string' },
      category: { bsonType: 'string' },
      language: { bsonType: 'string' },
      format: { enum: ['in-person', 'online', 'hybrid'] },
      event_date: { bsonType: 'date' },
      start_date: { bsonType: 'string' },
      start_time: { bsonType: 'string' },
      end_date: { bsonType: 'string' },
      end_time: { bsonType: 'string' },
      location: { bsonType: 'string' },
      online_url: { bsonType: 'string' },
      capacity: { bsonType: ['int', 'long', 'double', 'null'], minimum: 1 },
      current_participants: { bsonType: ['int', 'long', 'double'], minimum: 0 },
      cover_image_url: { bsonType: 'string' },
      status: { enum: ['published', 'draft'] },
      created_at: { bsonType: 'date' },
      updated_at: { bsonType: 'date' },
    },
  },
};

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

    await db.collection('events').updateMany(
      { status: { $exists: false } },
      [
        {
          $set: {
            description: { $ifNull: ['$description', ''] },
            category: { $ifNull: ['$category', ''] },
            language: { $ifNull: ['$language', ''] },
            format: { $ifNull: ['$format', 'in-person'] },
            start_date: {
              $ifNull: [
                '$start_date',
                { $dateToString: { format: '%Y-%m-%d', date: '$event_date' } },
              ],
            },
            start_time: {
              $ifNull: [
                '$start_time',
                { $dateToString: { format: '%H:%M', date: '$event_date' } },
              ],
            },
            end_date: {
              $ifNull: [
                '$end_date',
                { $dateToString: { format: '%Y-%m-%d', date: '$event_date' } },
              ],
            },
            end_time: {
              $ifNull: [
                '$end_time',
                { $dateToString: { format: '%H:%M', date: '$event_date' } },
              ],
            },
            online_url: { $ifNull: ['$online_url', ''] },
            current_participants: { $ifNull: ['$current_participants', 0] },
            cover_image_url: { $ifNull: ['$cover_image_url', ''] },
            status: 'published',
            created_at: { $ifNull: ['$created_at', now] },
            updated_at: { $ifNull: ['$updated_at', now] },
          },
        },
      ],
    );

    await db.command({
      collMod: 'events',
      validator: eventValidator,
      validationLevel: 'moderate',
      validationAction: 'error',
    });

    await db.collection('events').createIndex(
      { status: 1, event_date: 1 },
      { name: 'events_status_event_date_idx' },
    );
  },

  async down(db) {
    if (process.env.DB_MIGRATION_TARGET !== 'local') {
      throw new Error('Refusing to rollback schema migration outside local database.');
    }

    await dropIndexIfExists(db, 'events', 'events_status_event_date_idx');
  },
};
