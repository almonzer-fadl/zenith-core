import { ApiError } from "@/lib/api";

export interface ListQuery {
  page: number;
  limit: number;
  from?: Date;
  to?: Date;
}

export function parseListQuery(url: URL): ListQuery {
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");

  if (!Number.isFinite(page) || page < 1) {
    throw new ApiError(400, "INVALID_PAGE", "page must be >= 1");
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 200) {
    throw new ApiError(400, "INVALID_LIMIT", "limit must be between 1 and 200");
  }

  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;

  if (fromRaw && Number.isNaN(from?.getTime())) {
    throw new ApiError(400, "INVALID_FROM", "from must be valid ISO date");
  }
  if (toRaw && Number.isNaN(to?.getTime())) {
    throw new ApiError(400, "INVALID_TO", "to must be valid ISO date");
  }

  return { page, limit, from, to };
}

export function buildDateRangeFilter(from?: Date, to?: Date) {
  if (!from && !to) return {};
  return {
    loggedAt: {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {})
    }
  };
}
