import {SendMailClient as ZeptomailClient} from "zeptomail";
import { AbstractMailClient } from "./abstract-email-client";
import { SendMailOptions } from "./types";

/**
 * ZeptoMailAdapter class to send emails using ZeptoMail service.
 */
class ZeptoMailAdapter extends AbstractMailClient {
  private token: string;
  
  constructor() {
    const token = process.env.ZEPTOMAIL_TOKEN;
    super();
    if (!token) {
      throw new Error(
        "ZeptoMail token is required. Please set ZEPTOMAIL_TOKEN environment variable.",
      );
    }
    this.token = token;
  }
  async sendMail(options: SendMailOptions) {
    const client = new ZeptomailClient({
      url: "api.zeptomail.com/",
      token: this.token,
    });

    return await client.sendMail({
      to: options.to.map((recipient) => ({
        email_address: {
          address: recipient.address,
          name: recipient.name,
        },
      })),
      subject: options.subject,
      htmlbody: options.html,
      attachments: options.attachments,
      from: {
        address: options.from.address,
        name: options.from.name,
      },
      ...(options.replyTo && {
        reply_to: options.replyTo.map((reply) => ({
          address: reply.address,
          name: reply.name,
        })),
      }),
      ...(options.cc && {
        cc: options.cc.map((ccRecipient) => ({
          email_address: {
            address: ccRecipient.address,
            name: ccRecipient.name,
          },
        })),
      }),
    });
  }
}

export default ZeptoMailAdapter;
