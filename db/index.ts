import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { runtimeEnv } from '../lib/runtime-env';
import * as schema from './schema';

export function getDb() {
  if (!runtimeEnv.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  return drizzle(neon(runtimeEnv.DATABASE_URL), { schema });
}

