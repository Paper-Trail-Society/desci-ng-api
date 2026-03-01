import { describe, it } from "vitest";
import { renderCommentBody } from "../../src/modules/papers/service";
import { MAX_COMMENT_LENGTH } from "../../src/modules/papers/schema";

function generateRandomString(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

describe("renderCommentBody", () => {
  it("should return HTML and markdown equivalent of a markdown comment", async ({
    expect,
  }) => {
    const comment = renderCommentBody("**This is a comment**");

    expect(comment.bodyHtml).toBe(
      "<p><strong>This is a comment</strong></p>\n",
    );
    expect(comment.bodyMarkdown).toBe("**This is a comment**");
  });

  it("should not convert markdown headings to HTML heading tags", async ({
    expect,
  }) => {
    const heading1 = renderCommentBody("# This is a comment");

    console.log({heading1})

    expect(heading1.bodyHtml).toBe("This is a comment\n");
    expect(heading1.bodyMarkdown).toBe("# This is a comment");

    const heading2 = renderCommentBody("## This is a comment");

    expect(heading2.bodyHtml).toBe("This is a comment\n");
    expect(heading2.bodyMarkdown).toBe("## This is a comment");

    const heading3 = renderCommentBody("### This is a comment");

    expect(heading3.bodyHtml).toBe("This is a comment\n");
    expect(heading3.bodyMarkdown).toBe("### This is a comment");

    const heading4 = renderCommentBody("#### This is a comment");

    expect(heading4.bodyHtml).toBe("This is a comment\n");
    expect(heading4.bodyMarkdown).toBe("#### This is a comment");

    const heading5 = renderCommentBody("##### This is a comment");

    expect(heading5.bodyHtml).toBe("This is a comment\n");
    expect(heading5.bodyMarkdown).toBe("##### This is a comment");

    const heading6 = renderCommentBody("###### This is a comment");

    expect(heading6.bodyHtml).toBe("This is a comment\n");
    expect(heading6.bodyMarkdown).toBe("###### This is a comment");
  });

  it("should throw an error if comment body is greater than 2000 chars", async ({ expect}) => {
    expect(() => renderCommentBody(generateRandomString(MAX_COMMENT_LENGTH + 1))).toThrowError();
  })
});
