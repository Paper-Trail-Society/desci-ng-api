export type PaperStatus = "pending" | "published" | "rejected";

export interface PaperUser {
  id: string;
  name: string;
  email: string;
}

export interface PaperKeyword {
  id: number;
  name: string;
  aliases: string[] | null;
}

export interface PaperCategory {
  id: number;
  name: string;
  fieldId: number;
}

export interface PaperField {
  id: number;
  name: string;
}

export interface Paper extends Record<string, unknown> {
  id: number;
  title: string;
  slug: string;
  abstract: string;
  notes: string;
  status: PaperStatus;
  ipfsCid: string;
  ipfsUrl: string;
  userId: string;
  categoryId: number;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;

  user: PaperUser;
  category: PaperCategory;
  field: PaperField;
  keywords: PaperKeyword[] | null;
}

export type PaginatedPapersResponse = {
  data: Paper[];
  prev_page: string | null;
  next_page: string | null;
  total: number;
  size: number;
};

export interface PaperCommentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface PaperComment {
  id: number;
  paperId: number;
  authorId: string;
  parentCommentId: number | null;
  bodyMarkdown: string;
  bodyHtml: string;
  createdAt: Date;
  updatedAt: Date;
  author: PaperCommentAuthor;
}

export type CommentNotificationEmailTemplateParameters = {

  /**
   * The notification title
   */
  notificationTitle: string;

  /**
   * The entity that the comment was made on. 
   * Set to `post` If it's a parent comment, and `comment` if it's a reply to a comment.
   */
  entity: 'post' | 'comment'

  /**
   * Title of the paper
   */
  paperTitle: string;

  /**
   * The name of the paper's author
   */
  paperAuthorName: string;

  /**
   * The name of the commenter
   */
  commenterName: string;

  /**
   * The comment
   */
  commentText: string;

  /** Date and Time formatted in human-readable format */
  commentTimestamp: string;

  /**
   * The link to the comment on Nubian
   */
  commentUrl: string
}

export type CommentNotificationRecipient = {
  name: string;
  email: string
}
