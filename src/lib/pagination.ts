import type { ApiMeta } from "@/lib/api-response";
import type { Paginated } from "@/types";

export interface PageArgs {
  page: number;
  pageSize: number;
}

export function toSkipTake({ page, pageSize }: PageArgs) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginate<T>(items: T[], total: number, args: PageArgs): Paginated<T> {
  return {
    items,
    page: args.page,
    pageSize: args.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / args.pageSize)),
  };
}

export function pageMeta(p: Paginated<unknown>): ApiMeta {
  return {
    page: p.page,
    pageSize: p.pageSize,
    total: p.total,
    totalPages: p.totalPages,
  };
}
