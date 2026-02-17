import crypto from "crypto";
import {
  db,
  usersTable,
  adminsTable,
  UserInsert,
  User,
  AdminInsert,
  Admin,
} from "./db";
import { auth } from "../../src/utils/auth";

export class UserFactory {
  private static userCounter = 1;

  static async create(
    overrides: Partial<UserInsert> = {},
  ): Promise<User & { authToken: string }> {
    const n = this.userCounter++;

    const [user] = await db
      .insert(usersTable)
      .values({
        id: overrides.id ?? crypto.randomUUID(),
        name: overrides.name ?? `Test User ${n}`,
        email: overrides.email ?? `user${n}@example.test`,
        emailVerified: overrides.emailVerified ?? false,
        ...overrides,
      })
      .returning();

    const ctx = await auth.$context;
    const session = await ctx.internalAdapter.createSession(user.id, false);

    return { ...user, authToken: session.token };
  }
}

export class AdminFactory {
  private static adminCounter = 1;

  static async create(overrides: Partial<AdminInsert> = {}): Promise<Admin> {
    const n = this.adminCounter++;

    const [admin] = await db
      .insert(adminsTable)
      .values({
        id: overrides.id ?? crypto.randomUUID(),
        name: overrides.name ?? `Test Admin ${n}`,
        email: overrides.email ?? `admin${n}@example.test`,
        emailVerified: overrides.emailVerified ?? false,
        ...overrides,
      })
      .returning();

    return admin;
  }
}
