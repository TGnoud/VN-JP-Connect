const userValidator = {
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
      'status',
      'status_updated_at',
      'role',
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
      status: { enum: ['active', 'frozen'] },
      status_updated_at: { bsonType: 'date' },
      role: { enum: ['customer', 'admin'] },
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
    await db.collection('users').updateMany(
      {},
      [
        {
          $set: {
            role: { $ifNull: ['$role', 'customer'] },
          },
        },
      ],
    );

    await db.command({
      collMod: 'users',
      validator: userValidator,
      validationLevel: 'moderate',
      validationAction: 'error',
    });

    await db.collection('users').createIndex(
      { role: 1 },
      { name: 'users_role_idx' },
    );
  },

  async down(db) {
    if (process.env.DB_MIGRATION_TARGET !== 'local') {
      throw new Error('Refusing to rollback schema migration outside local database.');
    }

    await dropIndexIfExists(db, 'users', 'users_role_idx');
  },
};
