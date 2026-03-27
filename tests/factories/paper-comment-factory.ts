import { PaperRepository } from "../../src/modules/papers/repository";

type CreateCommentOptions = {
  body: string;
  parentCommentId: number | null;
  paperId: number;
  authorId: string;
};

export class PaperCommentFactory {
  private static commentCounter = 1;

  private paperRepository: PaperRepository;

  constructor() {
    this.paperRepository = new PaperRepository();
  }

  async create(options: CreateCommentOptions) {
    const comment = await this.paperRepository.createComment({
      authorId: options.authorId,
      paperId: options.paperId,
      bodyHtml: options.body,
      bodyMarkdown: options.body,
      parentCommentId: options.parentCommentId,
    });

    return comment;
  }
}
