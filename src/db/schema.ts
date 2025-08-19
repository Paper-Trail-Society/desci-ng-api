import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  email: text("email").notNull().unique(),
});

export const papersTable = pgTable(
  "papers",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    notes: text("notes").notNull(),
    abstract: text("abstract").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    fieldId: integer("field_id").notNull().references(() => fieldsTable.id),
    categoryId: integer("categoryId").notNull().references(() => categoriesTable.id),
    keywords: jsonb("keywords").notNull(),
    ipfsCid: text("ipfs_cid").notNull(),
    ipfsUrl: text("ipfs_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("title_idx").on(table.title),
    index("abstract_idx").on(table.abstract),
    index("field_id_idx").on(table.fieldId),
    index("category_id_idx").on(table.categoryId),

    index("keywords_gin_idx").using("gin", table.keywords),
    index("search_index").using(
      "gin",
      sql`(
        setweight(to_tsvector('english', ${table.title}), 'A') ||
        setweight(to_tsvector('english', ${table.abstract}), 'B')
    )`
    ),
  ]
);

export const fieldsTable = pgTable("fields", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fieldId: integer("field_id")
    .notNull()
    .references(() => fieldsTable.id, { onDelete: "cascade" }),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertPaper = typeof papersTable.$inferInsert;
export type SelectPaper = typeof papersTable.$inferSelect;
