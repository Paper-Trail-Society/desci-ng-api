import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

const desciSchema = pgSchema("desci");

export const adminsTable = desciSchema.table("admins", {
  id: text("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const adminSessionsTable = desciSchema.table("admin_sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => adminsTable.id, { onDelete: "cascade" }),
});

export const adminAccountsTable = desciSchema.table("admin_accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => adminsTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const adminVerificationsTable = desciSchema.table(
  "admin_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").$defaultFn(
      () => /* @__PURE__ */ new Date(),
    ),
    updatedAt: timestamp("updated_at").$defaultFn(
      () => /* @__PURE__ */ new Date(),
    ),
  },
);

export const adminJwksTable = desciSchema.table("admin_jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const usersTable = desciSchema.table("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  institutionId: integer("institution_id").references(
    () => institutionsTable.id,
  ),
  areasOfInterest: text("areas_of_interest"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const sessionsTable = desciSchema.table("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
});

export const accountsTable = desciSchema.table("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verificationsTable = desciSchema.table("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const papersTable = desciSchema.table(
  "papers",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    notes: text("notes").notNull(),
    abstract: text("abstract").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categoriesTable.id),
    status: varchar("status", { length: 255 }).notNull().default("pending"), // pending, rejected, published
    reviewedBy: text("reviewed_by").references(() => adminsTable.id, {
      onDelete: "set null",
    }), // approved_by should be null for existing papers
    rejectionReason: text("rejection_reason"),
    ipfsCid: varchar("ipfs_cid", { length: 80 }).notNull(),
    ipfsUrl: varchar("ipfs_url", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("slug_idx").on(table.slug),
    index("title_idx").on(table.title),
    index("abstract_idx").on(table.abstract),
    index("category_id_idx").on(table.categoryId),
    index("user_id_idx").on(table.userId),
    index("status_idx").on(table.status),

    index("search_index").using(
      "gin",
      sql`(
        setweight(to_tsvector('english', ${table.title}), 'A') ||
        setweight(to_tsvector('english', ${table.abstract}), 'B')
    )`,
    ),
  ],
);

export const paperKeywordsTable = desciSchema.table(
  "paper_keywords",
  {
    id: serial("id").primaryKey(),
    paperId: integer("paper_id")
      .notNull()
      .references(() => papersTable.id, { onDelete: "cascade" }),
    keywordId: integer("keyword_id")
      .notNull()
      .references(() => keywordsTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("paper_keywords_unique_idx").on(table.paperId, table.keywordId),
  ],
);

export const keywordsTable = desciSchema.table(
  "keywords",
  {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    aliases: jsonb("aliases"),
  },
  (table) => [
    // Trigram index for fast fuzzy search on name (with pg_trgm extension)
    index("keywords_name_trgm_idx").using(
      "gin",
      sql`${table.name} gin_trgm_ops`,
    ),

    // Trigram index on aliases (JSONB text values) (with pg_trgm extension)
    index("keywords_aliases_trgm_idx").using(
      "gin",
      sql`(jsonb_path_query_array(${table.aliases}, '$[*]')::text) gin_trgm_ops`,
    ),
  ],
);

export const fieldsTable = desciSchema.table("fields", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
});

export const categoriesTable = desciSchema.table("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  fieldId: integer("field_id")
    .notNull()
    .references(() => fieldsTable.id, { onDelete: "cascade" }),
});

export const institutionsTable = desciSchema.table("institutions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const jwksTable = desciSchema.table("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const paystackDonationsTable = desciSchema.table("paystack_donations", {
  id: serial("id").primaryKey(),
  donorId: text("donor_id").references(() => usersTable.id, {
    onDelete: "no action",
  }),
  donorName: varchar("donor_name", { length: 255 }).notNull(),
  donorEmail: varchar("donor_email").notNull(),
  amount: integer("amount").notNull(),
  currencyCode: varchar("currency_code", { length: 3 }).notNull(),
  paymentReference: varchar("payment_reference").unique().notNull(),
  paymentStatus: varchar("payment_status", { length: 10 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 10 }).notNull(),
  paidAt: timestamp("paid_at").notNull(),
  transactionData: jsonb("transaction_data").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertPaper = typeof papersTable.$inferInsert;
export type UpdatePaper = Omit<
  InsertPaper,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "slug"
>;
export type SelectPaper = typeof papersTable.$inferSelect;

export type InsertInstitution = typeof institutionsTable.$inferInsert;
export type SelectInstitution = typeof institutionsTable.$inferSelect;
