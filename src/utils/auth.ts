
import { readFileSync } from "fs";
import { join } from "path";
import Handlebars from "handlebars";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, jwt, openAPI } from "better-auth/plugins";
import * as schema from "../db/schema";
import { db } from "../config/db";
import { logger } from "../config/logger";
import { mailService } from "./email/email";

const authLogger = logger.child({ origin: "auth", });

export const auth = betterAuth({
  appName: "Nubian",
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
  advanced: {
    cookiePrefix: "nubianresearch",
    crossSubDomainCookies: {
      enabled: true,
      domain: "nubianresearch.com",
    },
  },
  rateLimit: {
    enabled: false,
  },
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
    requireEmailVerification:
      process.env.NODE_ENV === "production" ? true : false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        void sendPasswordResetEmail({ user, resetUrl: url });
        logger.info(`Password reset email sent to ${user.email}`);
      } catch (error) {
        logger.error(
          error,
          `Failed to send password reset email to ${user.email}:`,
        );
        throw error;
      }
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail({ user, verificationUrl: url });
    },
  },
  plugins: [openAPI(), jwt(), bearer()],
  logger: {
    level: "info",
    log: (level, message, ...args) => {
      authLogger.info({
        level,
        message,
        metadata: args,
      });
    },
  },
});

const sendPasswordResetEmail = async ({
  user,
  resetUrl,
}: {
  user: { name: string; email: string };
  resetUrl: string;
}) => {
  const templatePath = join(__dirname, "../email-templates/password-reset.hbs");
  const templateSource = readFileSync(templatePath, "utf8");
  const template = Handlebars.compile(templateSource);

  const html = template({
    userName: user.name,
    resetUrl: resetUrl,
  });

  try {
    await mailService.send({
      to: [{ address: user.email, name: user.name }],
      subject: "Password Reset Request",
      html,
      from: {
        address: process.env.MAIL_FROM_EMAIL!,
        name: process.env.MAIL_FROM_NAME || "Nubian Research",
      },
    });
  } catch (error) {
    authLogger.error(
      error,
      `Failed to send password reset email to ${user.email}:`,
    );
  }
};

const sendVerificationEmail = async ({
  user,
  verificationUrl,
}: {
  user: { name: string; email: string };
  verificationUrl: string;
}) => {
  const templatePath = join(
    __dirname,
    "../email-templates/email-verification.hbs",
  );
  const templateSource = readFileSync(templatePath, "utf8");
  const template = Handlebars.compile(templateSource);

  const html = template({
    userName: user.name,
    verificationUrl: verificationUrl,
  });

  try {
    await mailService.send({
      to: [{ address: user.email, name: user.name }],
      subject: "Email Verification",
      html,
      from: {
        address: process.env.MAIL_FROM_EMAIL || "noreply@nubianresearch.com",
        name: process.env.MAIL_FROM_NAME || "Nubian Research",
      },
    });
  } catch (error) {
    authLogger.error(error, `Failed to send verification email to ${user.email}:`);
  }
};
