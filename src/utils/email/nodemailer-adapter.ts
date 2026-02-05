import nodemailer from "nodemailer";
import { AbstractMailClient } from "./abstract-email-client";
import { SendMailOptions } from "./types";

/**
 * NodemailerAdapter class to send emails using SMTP via Nodemailer.
 */
class NodemailerAdapter extends AbstractMailClient {
  async sendMail(options: SendMailOptions) {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    return await transporter.sendMail({
      from: `"${options.from.name}" <${options.from.address}>`,
      to: options.to.map((recipient) =>
        recipient.name
          ? `"${recipient.name}" <${recipient.address}>`
          : recipient.address,
      ),
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
      ...(options.replyTo && {
        replyTo: options.replyTo
          .map((reply) =>
            reply.name ? `"${reply.name}" <${reply.address}>` : reply.address,
          )
          .join(", "),
      }),
      ...(options.cc && {
        cc: options.cc
          .map((ccRecipient) =>
            ccRecipient.name
              ? `"${ccRecipient.name}" <${ccRecipient.address}>`
              : ccRecipient.address,
          )
          .join(", "),
      }),
    });
  }
}

export default NodemailerAdapter;
