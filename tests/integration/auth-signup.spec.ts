import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import request from "supertest";
import { beforeEach, describe, it } from "vitest";

import app from "../../src/app";
import { db, institutionsTable, usersTable } from "../factories/db";
import { InstitutionFactory } from "../factories/institution-factory";
import { DatabaseSeeder } from "../setup/database-seeder";

const api = request(app);

beforeEach(async () => {
  await DatabaseSeeder.reset();
});

describe("POST /auth/sign-up/email", () => {
  it("keeps the selected existing institution on the created user", async ({
    expect,
  }) => {
    const institution = await InstitutionFactory.create({
      name: "University of Lagos",
    });

    const email = "existing-institution@example.test";

    await api
      .post("/auth/sign-up/email")
      .set("origin", "http://localhost:3000")
      .send({
        name: "Ada Lovelace",
        email,
        password: "Password123",
        institutionId: institution.id,
        institutionInput: institution.name,
      })
      .expect("Content-Type", /json/)
      .expect(200);

    const [createdUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    expect(createdUser).toBeDefined();
    expect(createdUser.institutionId).toBe(institution.id);
  });

  it("creates a new institution from typed input and links it to the user", async ({
    expect,
  }) => {
    const email = "new-institution@example.test";
    const institutionName = "Towson University";

    await api
      .post("/auth/sign-up/email")
      .set("origin", "http://localhost:3000")
      .send({
        name: "Grace Hopper",
        email,
        password: "Password123",
        institutionInput: institutionName,
      })
      .expect("Content-Type", /json/)
      .expect(200);

    const [createdUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    const [createdInstitution] = await db
      .select()
      .from(institutionsTable)
      .where(
        sql`lower(${institutionsTable.name}) = ${institutionName.toLowerCase()}`,
      );

    expect(createdUser).toBeDefined();
    expect(createdInstitution).toBeDefined();
    expect(createdInstitution.name).toBe(institutionName);
    expect(createdUser.institutionId).toBe(createdInstitution.id);
  });

  it("reuses an existing institution for case-insensitive typed matches", async ({
    expect,
  }) => {
    const institution = await InstitutionFactory.create({
      name: "University of Ibadan",
    });

    const email = "case-insensitive@example.test";

    await api
      .post("/auth/sign-up/email")
      .set("origin", "http://localhost:3000")
      .send({
        name: "Katherine Johnson",
        email,
        password: "Password123",
        institutionInput: "   university of ibadan   ",
      })
      .expect("Content-Type", /json/)
      .expect(200);

    const [createdUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    const matchingInstitutions = await db
      .select()
      .from(institutionsTable)
      .where(
        sql`lower(${institutionsTable.name}) = ${institution.name.toLowerCase()}`,
      );

    expect(createdUser).toBeDefined();
    expect(createdUser.institutionId).toBe(institution.id);
    expect(matchingInstitutions).toHaveLength(1);
  });
});
