import "./zeptomail.d";
import { SendMailClient } from "zeptomail";

interface EmailConfig {
  zeptoMailToken: string;
  fromEmail: string;
  fromName?: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  replyTo?: string;
}

interface ResetPasswordEmailOptions {
  to: string;
  userName: string;
  resetUrl: string;
}

class EmailService {
  private client: any;
  private fromEmail: string;
  private fromName: string;

  constructor(config?: Partial<EmailConfig>) {
    const token = config?.zeptoMailToken || process.env.ZEPTOMAIL_TOKEN;
    this.fromEmail =
      config?.fromEmail ||
      process.env.ZEPTOMAIL_FROM_EMAIL ||
      "noreply@example.com";
    this.fromName =
      config?.fromName || process.env.ZEPTOMAIL_FROM_NAME || "DeSci NG";

    if (!token) {
      throw new Error(
        "ZeptoMail token is required. Please set ZEPTOMAIL_TOKEN environment variable.",
      );
    }

    // Initialize ZeptoMail client
    const url = "api.zeptomail.com/";
    this.client = new SendMailClient({ url, token });
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { to, subject, htmlBody, textBody, replyTo } = options;

    if (!htmlBody && !textBody) {
      throw new Error("Either htmlBody or textBody must be provided");
    }

    const recipients = Array.isArray(to) ? to : [to];

    try {
      await this.client.sendMail({
        from: {
          address: this.fromEmail,
          name: this.fromName,
        },
        to: recipients.map((email) => ({
          email_address: {
            address: email,
          },
        })),
        subject,
        htmlbody: htmlBody || "",
        textbody: textBody || "",
        ...(replyTo && {
          reply_to: [
            {
              address: replyTo,
            },
          ],
        }),
      });

      console.log(`Email sent successfully to: ${recipients.join(", ")}`);
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    options: ResetPasswordEmailOptions,
  ): Promise<void> {
    const { to, userName, resetUrl } = options;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
          }
          h1 {
            color: #1F2937;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #4338CA;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            font-size: 14px;
            color: #6B7280;
          }
          .warning {
            background-color: #FEF3C7;
            border: 1px solid #F59E0B;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
            color: #92400E;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DeSci NG</div>
          </div>

          <h1>Password Reset Request</h1>

          <p>Hi ${userName},</p>

          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>

          <p>To reset your password, click the button below:</p>

          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> This password reset link will expire in 1 hour for security reasons.
          </div>

          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>

          <div class="footer">
            <p>This is an automated message from DeSci NG.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Password Reset Request

Hi ${userName},

We received a request to reset your password. If you didn't make this request, you can safely ignore this email.

To reset your password, please visit the following link:
${resetUrl}

Important: This password reset link will expire in 1 hour for security reasons.

This is an automated message from DeSci NG.
Please do not reply to this email.
    `.trim();

    await this.sendEmail({
      to,
      subject: "Password Reset Request - DeSci NG",
      htmlBody,
      textBody,
    });
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(options: {
    to: string;
    userName: string;
    verificationUrl: string;
  }): Promise<void> {
    const { to, userName, verificationUrl } = options;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4F46E5;
          }
          h1 {
            color: #1F2937;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #10B981;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #059669;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            font-size: 14px;
            color: #6B7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DeSci NG</div>
          </div>

          <h1>Verify Your Email Address</h1>

          <p>Hi ${userName},</p>

          <p>Welcome to DeSci NG! Please verify your email address to complete your registration.</p>

          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email</a>
          </div>

          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>

          <div class="footer">
            <p>This is an automated message from DeSci NG.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Verify Your Email Address

Hi ${userName},

Welcome to DeSci NG! Please verify your email address to complete your registration.

To verify your email, please visit the following link:
${verificationUrl}

This is an automated message from DeSci NG.
Please do not reply to this email.
    `.trim();

    await this.sendEmail({
      to,
      subject: "Verify Your Email - DeSci NG",
      htmlBody,
      textBody,
    });
  }
}

// Export a singleton instance
export const emailService = new EmailService();

// Also export the class for custom instances
export { EmailService };
