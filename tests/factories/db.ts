import { db } from "../../src/config/db";
import * as schema from "../../src/db/schema";

export { db };

export const {
  usersTable,
  adminsTable,
  fieldsTable,
  categoriesTable,
  keywordsTable,
  papersTable,
  paperKeywordsTable,
  institutionsTable,
} = schema;

export type UserInsert = typeof schema.usersTable.$inferInsert;
export type User = typeof schema.usersTable.$inferSelect;

export type AdminInsert = typeof schema.adminsTable.$inferInsert;
export type Admin = typeof schema.adminsTable.$inferSelect;

export type FieldInsert = typeof schema.fieldsTable.$inferInsert;
export type Field = typeof schema.fieldsTable.$inferSelect;

export type CategoryInsert = typeof schema.categoriesTable.$inferInsert;
export type Category = typeof schema.categoriesTable.$inferSelect;

export type KeywordInsert = typeof schema.keywordsTable.$inferInsert;
export type Keyword = typeof schema.keywordsTable.$inferSelect;

export type PaperInsert = typeof schema.papersTable.$inferInsert;
export type Paper = typeof schema.papersTable.$inferSelect;

export type InstitutionInsert = typeof schema.institutionsTable.$inferInsert;
export type Institution = typeof schema.institutionsTable.$inferSelect;

