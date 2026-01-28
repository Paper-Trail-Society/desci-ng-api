import { URLSearchParams } from "url";


export interface OffsetPaginationOptions {
  total: number;
  page: number;
  size: number;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export interface OffsetPaginationLinks {
  next_page: string | null;
  prev_page: string | null;
}

export function buildOffsetPaginationLinks(
  basePath: string,
  { total, page, size, query = {} }: OffsetPaginationOptions,
): OffsetPaginationLinks {
  const offset = (page - 1) * size;
  const hasNext = total > offset + size;
  const hasPrev = page > 1;

  const buildUrl = (pageValue: number) => {
    const params = new URLSearchParams();
    params.set("page", String(pageValue));
    params.set("size", String(size));

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (key === "page" || key === "size") continue;
      params.set(key, String(value));
    }

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  return {
    next_page: hasNext ? buildUrl(page + 1) : null,
    prev_page: hasPrev ? buildUrl(page - 1) : null,
  };
}

