import { describe, it, vi } from "vitest";
import { PaperService } from "../../src/modules/papers/service";
import { MAX_COMMENT_LENGTH } from "../../src/modules/papers/schema";
import MailService from "../../src/utils/email/mail-service";
import { AbstractMailClient } from "../../src/utils/email/abstract-email-client";

vi.mock('../../src/utils/mail-service', () => ({
  MailService: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
}));

function generateRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

describe("PaperService.renderCommentBody", () => {
  it("should return HTML and markdown equivalent of a markdown comment", async ({
    expect,
  }) => {
    const paperService = new PaperService(new MailService());
    const comment = paperService.renderCommentBody(
      "**This is a comment**",
    );

    expect(comment.bodyHtml).toBe(
      "<p><strong>This is a comment</strong></p>\n",
    );
    expect(comment.bodyMarkdown).toBe("**This is a comment**");
  });

  it("converts h1 markdown heading to h4 HTML heading", async ({ expect }) => {
    const paperService = new PaperService(new MailService());

    const heading1 = paperService.renderCommentBody("# This is a comment");

    expect(heading1.bodyHtml).toBe("<h4>This is a comment</h4>\n");
    expect(heading1.bodyMarkdown).toBe("# This is a comment");
  });

  it("converts h2 markdown heading to h4 HTML heading", async ({ expect }) => {
    const paperService = new PaperService(new MailService());

    const heading2 = paperService.renderCommentBody("## This is a comment");

    expect(heading2.bodyHtml).toBe("<h4>This is a comment</h4>\n");
    expect(heading2.bodyMarkdown).toBe("## This is a comment");
  });

  it("converts h3 markdown heading to h4 HTML heading", async ({ expect }) => {
    const paperService = new PaperService(new MailService());

    const heading3 = paperService.renderCommentBody("### This is a comment");

    expect(heading3.bodyHtml).toBe("<h4>This is a comment</h4>\n");
    expect(heading3.bodyMarkdown).toBe("### This is a comment");
  });

  it("preserves h4 markdown heading as h4 HTML heading", async ({ expect }) => {
    const paperService = new PaperService(new MailService());

    const heading4 = paperService.renderCommentBody("#### This is a comment");

    expect(heading4.bodyHtml).toBe("<h4>This is a comment</h4>\n");
    expect(heading4.bodyMarkdown).toBe("#### This is a comment");
  });

  it("preserves h5 markdown heading as h5 HTML heading", async ({ expect }) => {
    const paperService = new PaperService(new MailService());

    const heading5 = paperService.renderCommentBody("##### This is a comment");

    expect(heading5.bodyHtml).toBe("<h5>This is a comment</h5>\n");
    expect(heading5.bodyMarkdown).toBe("##### This is a comment");
  });

  it("preserves h6 markdown heading as h6 HTML heading", async ({ expect }) => {
    const paperService = new PaperService(new MailService());

    const heading6 = paperService.renderCommentBody("###### This is a comment");

    expect(heading6.bodyHtml).toBe("<h6>This is a comment</h6>\n");
    expect(heading6.bodyMarkdown).toBe("###### This is a comment");
  });

  it("should throw an error if comment body is greater than 2000 chars", async ({
    expect,
  }) => {
    const paperService = new PaperService(new MailService());

    expect(() => 
      paperService.renderCommentBody(
        generateRandomString(MAX_COMMENT_LENGTH + 1),
      ),
    ).toThrowError();
  });
});
