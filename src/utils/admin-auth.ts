import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt, openAPI } from "better-auth/plugins";
import * as schema from "../db/schema";
import { db } from "../config/db";
import { logger } from "../config/logger";

export const adminAuth = betterAuth({
  appName: "Desci NG admin",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.adminsTable,
      session: schema.adminSessionsTable,
      account: schema.adminAccountsTable,
      verification: schema.adminVerificationsTable,
      jwks: schema.adminJwksTable,
    },
  }),
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .filter(Boolean),
  basePath: "/admin-auth",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    disableSignUp: process.env.NODE_ENV === "production" ? true : false,
  },
  plugins: [openAPI(), jwt(), bearer()],
  logger: {
    level: "info",
    log: (level, message, ...args) => {
      logger.child({ module: "auth", scope: "admin" }).info({
        level,
        message,
        metadata: args,
        timestamp: new Date().toISOString(),
      });
    },
  },
});
