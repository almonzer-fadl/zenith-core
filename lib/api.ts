import { NextResponse } from "next/server";
import { normalizeDoc } from "@/lib/dto";
import { logError } from "@/lib/observability";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

export function ok<T>(data: T, status = 200, requestId?: string) {
  return NextResponse.json({ success: true, data: normalizeDoc(data), requestId }, { status, headers: requestId ? { "x-request-id": requestId } : undefined });
}

export function fail(status: number, code: string, message: string, requestId?: string) {
  return NextResponse.json({ success: false, error: { code, message }, requestId }, { status, headers: requestId ? { "x-request-id": requestId } : undefined });
}

export function handleApiError(error: unknown, requestId?: string) {
  if (error instanceof ApiError) return fail(error.status, error.code, error.message, requestId);
  logError("unhandled_api_error", { requestId, error: error instanceof Error ? error.message : String(error) });
  return fail(500, "INTERNAL_ERROR", "Unexpected server error", requestId);
}
