import {
  db,
  institutionsTable,
  InstitutionInsert,
  Institution,
} from "./db";

export class InstitutionFactory {
  private static institutionCounter = 1;

  static async create(
    overrides: Partial<InstitutionInsert> = {},
  ): Promise<Institution> {
    const n = this.institutionCounter++;

    const [institution] = await db
      .insert(institutionsTable)
      .values({
        name: overrides.name ?? `Institution ${n}`,
        ...overrides,
      })
      .returning();

    return institution;
  }
}

