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
    data: Paper[]
    prev_page: string | null
    next_page: string | null
    total: number
    size: number
}