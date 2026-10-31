import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { runtimeEnv } from './runtime-env';

type Row = Record<string, unknown>;

let queryClient: NeonQueryFunction<false, false> | undefined;
let schemaPromise: Promise<void> | undefined;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL UNIQUE,
    identifier_type TEXT NOT NULL,
    password_hash TEXT,
    display_name TEXT,
    created_at DOUBLE PRECISION NOT NULL,
    verified_at DOUBLE PRECISION NOT NULL,
    last_login_at DOUBLE PRECISION NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT NOT NULL,
    identifier TEXT NOT NULL,
    created_at DOUBLE PRECISION NOT NULL,
    expires_at DOUBLE PRECISION NOT NULL,
    last_seen_at DOUBLE PRECISION NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS biodata_profiles (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    introduction TEXT NOT NULL,
    template TEXT NOT NULL DEFAULT 'saffron',
    photo_key TEXT,
    profile_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at DOUBLE PRECISION NOT NULL,
    completed_at DOUBLE PRECISION,
    updated_at DOUBLE PRECISION NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    actor_identifier TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    biodata_id TEXT,
    details_json TEXT NOT NULL DEFAULT '{}',
    created_at DOUBLE PRECISION NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at)',
  'CREATE UNIQUE INDEX IF NOT EXISTS biodata_profiles_owner_idx ON biodata_profiles(owner_id)',
  'CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs(created_at)',
  'CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON activity_logs(user_id)',
  'CREATE INDEX IF NOT EXISTS activity_logs_login_idx ON activity_logs(actor_identifier, action, created_at)',
] as const;

function getClient() {
  const connectionString = runtimeEnv.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  queryClient ??= neon(connectionString);
  return queryClient;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const client = getClient();
      for (const statement of schemaStatements) await client.query(statement, []);
    })().catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  await schemaPromise;
}

function convertPlaceholders(sql: string) {
  let parameter = 0;
  return sql.replace(/\?/g, () => `$${++parameter}`);
}

class PreparedQuery {
  private parameters: unknown[] = [];

  constructor(private readonly source: string) {}

  bind(...parameters: unknown[]) {
    this.parameters = parameters;
    return this;
  }

  private async execute<T extends Row>() {
    await ensureSchema();
    return getClient().query(convertPlaceholders(this.source), this.parameters) as Promise<T[]>;
  }

  async first<T extends Row>() {
    const rows = await this.execute<T>();
    return rows[0] ?? null;
  }

  async all<T extends Row>() {
    return { results: await this.execute<T>() };
  }

  async run() {
    await this.execute<Row>();
    return { success: true };
  }
}

export const database = {
  prepare(sql: string) {
    return new PreparedQuery(sql);
  },
};

export const databaseInternals = { convertPlaceholders };

