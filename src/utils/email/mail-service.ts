import { SendMailOptions } from "./types";
import ZeptoMailAdapter from "./zeptomail-adapter";
import NodemailerAdapter from "./nodemailer-adapter";
import { AbstractMailClient } from "./abstract-email-client";

type MailDriver = "zeptomail" | "smtp";

/**
 * MailService class to handle sending emails using different providers.
 */
class MailService {
  private provider: MailDriver;
  private client: AbstractMailClient;

  constructor() {
    this.provider = process.env.MAIL_DRIVER
      ? (process.env.MAIL_DRIVER as MailDriver)
      : "smtp";

    this.client = this.getClient();
  }

  private getClient() {
    switch (this.provider) {
      case "zeptomail":
        return new ZeptoMailAdapter();
      case "smtp": // only used in development for testing emails
        return new NodemailerAdapter();
      default:
        throw new Error(`Unsupported mail driver: ${this.provider}`);
    }
  }

  /**
   * 
   * Sends an email using the configured mail client.
   * @param options - The email options including recipients, subject, body, etc.
   * @returns A promise that resolves when the email is sent.
   */
  public send = async (options: SendMailOptions) => {
    return await this.client.sendMail(options);
  };
}

export const mailService = new MailService();

export default MailService;