import { pgTable, serial, text, timestamp, integer, boolean, uuid, unique, pgEnum } from 'drizzle-orm/pg-core';

// Define enums
export const roleEnum = pgEnum('role', ['user', 'admin', 'researcher']);
export const paperStatusEnum = pgEnum('paper_status', ['draft', 'published', 'under_review', 'rejected']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  bio: text('bio'),
  institution: text('institution'),
  avatarUrl: text('avatar_url'),
  isVerified: boolean('is_verified').default(false).notNull(),
  lastLogin: timestamp('last_login'),
});

// Papers table
export const papers = pgTable('papers', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  title: text('title').notNull(),
  abstract: text('abstract').notNull(),
  authorId: integer('author_id').references(() => users.id).notNull(),
  status: paperStatusEnum('status').default('draft').notNull(),
  doi: text('doi').unique(),
  publicationDate: timestamp('publication_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  citations: integer('citations').default(0).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
});

// Tags table
export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Paper-tags relation (many-to-many)
export const paperTags = pgTable('paper_tags', {
  id: serial('id').primaryKey(),
  paperId: integer('paper_id').references(() => papers.id).notNull(),
  tagId: integer('tag_id').references(() => tags.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    paperTagUnique: unique().on(table.paperId, table.tagId),
  };
});

// Comments table
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  paperId: integer('paper_id').references(() => papers.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  parentId: integer('parent_id').references(() => comments.id),
});

// Files table for paper attachments
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  paperId: integer('paper_id').references(() => papers.id).notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isMainPaper: boolean('is_main_paper').default(false).notNull(),
});

// Collaborators table (for papers with multiple authors)
export const collaborators = pgTable('collaborators', {
  id: serial('id').primaryKey(),
  paperId: integer('paper_id').references(() => papers.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: text('role').notNull().default('contributor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    collaboratorUnique: unique().on(table.paperId, table.userId),
  };
});
