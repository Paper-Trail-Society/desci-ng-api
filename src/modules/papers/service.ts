import path from "node:path";
import * as fs from "fs";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import Handlebars from "handlebars";
import { MAX_COMMENT_LENGTH } from "./schema";
import MailService from "../../utils/email/mail-service";
import {
  CommentNotificationEmailTemplateParameters,
  CommentNotificationRecipient,
} from "./types";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "strong",
    "em",
    "a",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "blockquote",
    "br",
  ],
  allowedAttributes: {
    a: ["href", "title", "class", "target", "rel"],
    "*": ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export class PaperService {
  private mailService: MailService;

  constructor(mailService: MailService) {
    this.mailService = mailService;
  }

  private commentNotificationTemplateName = "comment-notification.hbs";

  public renderCommentBody = (rawBody: string) => {
    const body = rawBody.trim();

    if (body.length > MAX_COMMENT_LENGTH) {
      throw new Error(
        `Comment body must be at most ${MAX_COMMENT_LENGTH} characters long`,
      );
    }

    const html = markdown.render(body);
    const safeHtml = sanitizeHtml(html, sanitizeOptions);

    return {
      bodyMarkdown: body,
      bodyHtml: safeHtml,
    };
  };

  public sendCommentNotification = async ({
    subject = "New comment on your post",
    recipient,
    parameters,
  }: {
    subject: string;
    recipient: CommentNotificationRecipient;
    parameters: CommentNotificationEmailTemplateParameters;
  }) => {
    const templatePath = path.resolve(
      __dirname,
      `../../email-templates/${this.commentNotificationTemplateName}`,
    );
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);

    const emailHtml = template({ ...parameters });

    return await this.mailService.send({
      to: [{ name: recipient.name, address: recipient.email }],
      subject,
      from: {
        address: process.env.MAIL_FROM_EMAIL!,
        name: process.env.MAIL_FROM_NAME || "Nubian Research",
      },
      html: emailHtml,
    });
  };

  public buildCommentUrl = (paperSlug: string, commentId: number) => {
    return `${this.buildPaperUrl(paperSlug)}#${commentId}`;
  };
  public buildPaperUrl = (paperSlug: string) => {
    return `https://nubianresearch.com/paper/${paperSlug}`;
  };
}
