import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { MAX_COMMENT_LENGTH } from "./schema";

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
    a: ["href", "title"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export const renderCommentBody = (rawBody: string) => {
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
