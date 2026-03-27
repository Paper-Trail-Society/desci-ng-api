import { describe, it, vi } from "vitest";
import type { Request, Response } from "express";
import { PapersController } from "../../src/modules/papers/controller";
import type { PaperRepository } from "../../src/modules/papers/repository";
import type { PaperService } from "../../src/modules/papers/service";

const createResponseMock = () => {
  const res = {} as Response;

  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);

  return res;
};

describe("PapersController.createComment", () => {
  it("uses markdown text for reply notification previews instead of HTML", async ({
    expect,
  }) => {
    const originalNotificationsSetting =
      process.env.ENABLE_COMMENT_NOTIFICATIONS;
    process.env.ENABLE_COMMENT_NOTIFICATIONS = "true";

    try {
      const papersRepository = {
        findPaperById: vi.fn().mockResolvedValue({
          id: 1,
          title: "Test Paper",
          slug: "test-paper",
          status: "published",
          userId: "paper-owner-id",
          author: {
            name: "Paper Owner",
            email: "owner@example.com",
          },
        }),
        getPaperCommentById: vi.fn().mockResolvedValue({
          id: 22,
          paperId: 1,
          parentCommentId: null,
          authorId: "comment-author-id",
          bodyHtml:
            "<p>this comment is to test whether an author receives a notification in their inbox.</p>\n",
          bodyMarkdown:
            "this comment is to test whether an author receives a notification in their inbox.",
          author: {
            id: "comment-author-id",
            name: "Comment Author",
            email: "comment-author@example.com",
          },
          createdAt: new Date("2026-03-27T10:00:00.000Z"),
          updatedAt: new Date("2026-03-27T10:00:00.000Z"),
        }),
        createComment: vi.fn().mockResolvedValue({
          id: 23,
          paperId: 1,
          parentCommentId: 22,
          authorId: "reply-author-id",
          bodyHtml: "<p>Reply body</p>\n",
          bodyMarkdown: "Reply body",
          createdAt: new Date("2026-03-27T10:05:00.000Z"),
          updatedAt: new Date("2026-03-27T10:05:00.000Z"),
        }),
      } as unknown as PaperRepository;

      const paperService = {
        renderCommentBody: vi.fn().mockReturnValue({
          bodyMarkdown: "Reply body",
          bodyHtml: "<p>Reply body</p>\n",
        }),
        sendCommentNotification: vi.fn().mockResolvedValue(undefined),
        buildCommentUrl: vi
          .fn()
          .mockReturnValue("https://nubianresearch.com/paper/test-paper#23"),
        buildPaperUrl: vi
          .fn()
          .mockReturnValue("https://nubianresearch.com/paper/test-paper"),
      } as unknown as PaperService;

      const controller = new PapersController(papersRepository, paperService);

      const req = {
        params: { paperId: "1" },
        body: { body: "Reply body", parentCommentId: 22 },
        user: {
          id: "reply-author-id",
          name: "Reply Author",
        },
        ctx: new Map(),
        log: {
          info: vi.fn(),
          warn: vi.fn(),
        },
      } as unknown as Request;

      const res = createResponseMock();

      await controller.createComment(req, res);

      expect(paperService.sendCommentNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({
            inReplyToText:
              "this comment is to test whether an author receives a notification in their inbox.",
          }),
        }),
      );
      expect(paperService.sendCommentNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.not.objectContaining({
            inReplyToText: expect.stringContaining("<p>"),
          }),
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    } finally {
      process.env.ENABLE_COMMENT_NOTIFICATIONS = originalNotificationsSetting;
    }
  });
});
