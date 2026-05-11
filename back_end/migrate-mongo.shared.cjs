require('dotenv').config();

function databaseNameFromUri(uri) {
  const parsedUri = new URL(uri);
  const databaseName = parsedUri.pathname.replace(/^\//, '');
  return databaseName || undefined;
}

function buildConfig(target) {
  const isLocal = target === 'local';
  const url = isLocal ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI;

  if (!url) {
    throw new Error(
      `Missing ${isLocal ? 'MONGO_LOCAL_URI' : 'MONGO_URI'} environment variable`,
    );
  }

  const databaseName =
    (isLocal
      ? process.env.MONGO_LOCAL_DATABASE_NAME
      : process.env.MONGO_ATLAS_DATABASE_NAME) ??
    process.env.MONGO_DATABASE_NAME ??
    databaseNameFromUri(url);

  if (!databaseName) {
    throw new Error(
      `Missing database name for ${target}. Add it to the URI path or set ${
        isLocal ? 'MONGO_LOCAL_DATABASE_NAME' : 'MONGO_ATLAS_DATABASE_NAME'
      }.`,
    );
  }

  process.env.DB_MIGRATION_TARGET = target;

  return {
    mongodb: {
      url,
      databaseName,
      options: {},
    },
    migrationsDir: 'migrations',
    changelogCollectionName: 'changelog',
    migrationFileExtension: '.cjs',
    useFileHash: false,
    moduleSystem: 'commonjs',
  };
}

module.exports = { buildConfig };
