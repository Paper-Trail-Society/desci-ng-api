import { sql } from "drizzle-orm";

import { db } from "../config/db";
import { institutionsTable } from "../db/schema";

export const normalizeInstitutionName = (name: string) =>
  name.trim().replace(/\s+/g, " ");

export const findInstitutionByName = async (name: string) => {
  const normalizedName = normalizeInstitutionName(name);

  if (!normalizedName) {
    return null;
  }

  const [institution] = await db
    .select({
      id: institutionsTable.id,
      name: institutionsTable.name,
    })
    .from(institutionsTable)
    .where(
      sql`lower(${institutionsTable.name}) = ${normalizedName.toLowerCase()}`,
    )
    .limit(1);

  return institution ?? null;
};

export const findOrCreateInstitutionByName = async (name: string) => {
  const normalizedName = normalizeInstitutionName(name);

  if (!normalizedName) {
    return null;
  }

  const existingInstitution = await findInstitutionByName(normalizedName);

  if (existingInstitution) {
    return existingInstitution;
  }

  try {
    const [createdInstitution] = await db
      .insert(institutionsTable)
      .values({
        name: normalizedName,
      })
      .returning({
        id: institutionsTable.id,
        name: institutionsTable.name,
      });

    return createdInstitution ?? null;
  } catch (error) {
    const institutionAfterConflict = await findInstitutionByName(normalizedName);

    if (institutionAfterConflict) {
      return institutionAfterConflict;
    }

    throw error;
  }
};
