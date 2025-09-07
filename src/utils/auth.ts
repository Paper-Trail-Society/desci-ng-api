import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt, openAPI } from "better-auth/plugins";
import * as schema from "../db/schema";
import { db } from "./db";
import { emailService } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.usersTable,
      session: schema.sessionsTable,
      account: schema.accountsTable,
      verification: schema.verificationsTable,
      jwks: schema.jwksTable,
    },
  }),
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .filter(Boolean),
  basePath: "/auth",
  user: {
    additionalFields: {
      institutionId: {
        type: "number",
        required: false,
      },
      areasOfInterest: {
        type: "string", // We'll store as JSON string for now
        required: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await emailService.sendPasswordResetEmail({
          to: user.email,
          userName: user.name || user.email,
          resetUrl: url,
        });
        console.log(`Password reset email sent to ${user.email}`);
      } catch (error) {
        console.error(
          `Failed to send password reset email to ${user.email}:`,
          error
        );
        throw error;
      }
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      try {
        if (process.env.NODE_ENV === "production") {
          await emailService.sendVerificationEmail({
            to: user.email,
            userName: user.name || user.email,
            verificationUrl: url,
          });
          console.log(`Verification email sent to ${user.email}`);
        } else {
          console.log(`Verification URL for ${user.email}: ${url}`);
        }
      } catch (error) {
        console.error(
          `Failed to send verification email to ${user.email}:`,
          error
        );
        throw error;
      }
    },
  },
  plugins: [openAPI(), jwt(), bearer()],
});
