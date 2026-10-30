import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const biodataProfiles = sqliteTable('biodata_profiles', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  introduction: text('introduction').notNull(),
  template: text('template').notNull().default('saffron'),
  photoKey: text('photo_key'),
  profileJson: text('profile_json').notNull().default('{}'),
  status: text('status').notNull().default('draft'),
  createdAt: integer('created_at').notNull().default(0),
  completedAt: integer('completed_at'),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [index('biodata_profiles_owner_idx').on(table.ownerId)]);

export const appUsers = sqliteTable('app_users', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  identifierType: text('identifier_type').notNull(),
  passwordHash: text('password_hash'),
  displayName: text('display_name'),
  createdAt: integer('created_at').notNull(),
  verifiedAt: integer('verified_at').notNull(),
  lastLoginAt: integer('last_login_at').notNull(),
}, (table) => [uniqueIndex('app_users_identifier_idx').on(table.identifier)]);

export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  role: text('role').notNull(),
  identifier: text('identifier').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
}, (table) => [index('auth_sessions_user_idx').on(table.userId), index('auth_sessions_expiry_idx').on(table.expiresAt)]);

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  actorIdentifier: text('actor_identifier').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  biodataId: text('biodata_id'),
  detailsJson: text('details_json').notNull().default('{}'),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('activity_logs_created_idx').on(table.createdAt), index('activity_logs_user_idx').on(table.userId)]);
