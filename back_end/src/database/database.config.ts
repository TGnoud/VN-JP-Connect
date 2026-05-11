export type DatabaseTarget = 'local' | 'atlas';

export type DatabaseEnv = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | 'DB_TARGET'
    | 'MONGO_LOCAL_URI'
    | 'MONGO_LOCAL_DATABASE_NAME'
    | 'MONGO_ATLAS_URI'
    | 'MONGO_URI'
    | 'MONGO_ATLAS_DATABASE_NAME'
    | 'NODE_ENV'
  >
>;

export interface MongoRuntimeConfig {
  target: DatabaseTarget;
  uri: string;
  dbName: string;
}

function resolveTarget(target: string | undefined, nodeEnv: string | undefined): DatabaseTarget {
  if (!target) {
    return nodeEnv === 'production' ? 'atlas' : 'local';
  }

  if (target === 'local') {
    return 'local';
  }

  if (target === 'atlas') {
    return 'atlas';
  }

  throw new Error(
    `Invalid DB_TARGET "${target}". Expected "local" or "atlas".`,
  );
}

function requireEnv(value: string | undefined, key: string, target: DatabaseTarget) {
  if (!value) {
    throw new Error(`Missing ${key} for DB_TARGET=${target}.`);
  }

  return value;
}

export function resolveMongoConfig(env: DatabaseEnv = process.env): MongoRuntimeConfig {
  const target = resolveTarget(env.DB_TARGET, env.NODE_ENV);

  if (target === 'atlas') {
    return {
      target,
      uri: requireEnv(
        env.MONGO_ATLAS_URI ?? env.MONGO_URI,
        'MONGO_ATLAS_URI or MONGO_URI',
        target,
      ),
      dbName: requireEnv(
        env.MONGO_ATLAS_DATABASE_NAME,
        'MONGO_ATLAS_DATABASE_NAME',
        target,
      ),
    };
  }

  return {
    target,
    uri: requireEnv(env.MONGO_LOCAL_URI, 'MONGO_LOCAL_URI', target),
    dbName: requireEnv(
      env.MONGO_LOCAL_DATABASE_NAME,
      'MONGO_LOCAL_DATABASE_NAME',
      target,
    ),
  };
}
