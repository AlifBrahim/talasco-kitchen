import { Pool, PoolClient, QueryConfig, QueryResult } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _fusionDbPool: Pool | undefined;
}

const pool = global._fusionDbPool ?? new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

if (!global._fusionDbPool) {
  global._fusionDbPool = pool;
}

export type DbQueryConfig<T extends any[] = any[]> = string | QueryConfig<T>;

export function getPool(): Pool {
  return pool;
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function dbQuery<R = any, T extends any[] = any[]>(
  queryConfig: DbQueryConfig<T>,
  values?: T,
): Promise<QueryResult<R>> {
  if (typeof queryConfig === 'string') {
    return pool.query<R>(queryConfig, values);
  }

  return pool.query<R>(queryConfig);
}
