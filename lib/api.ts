import { NextResponse } from "next/server";
import { normalizeDoc } from "@/lib/dto";
import { logError } from "@/lib/observability";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ok<T>(data: T, status = 200, requestId?: string) {
  return NextResponse.json({ success: true, data: normalizeDoc(data), requestId }, { status, headers: requestId ? { "x-request-id": requestId } : undefined });
}

export function fail(status: number, code: string, message: string, requestId?: string, details?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: { code, message, details }, requestId }, { status, headers: requestId ? { "x-request-id": requestId } : undefined });
}

export function handleApiError(error: unknown, requestId?: string) {
  if (error instanceof ApiError) return fail(error.status, error.code, error.message, requestId, error.details);
  logError("unhandled_api_error", { requestId, error: error instanceof Error ? error.message : String(error) });
  return fail(500, "INTERNAL_ERROR", "Unexpected server error", requestId);
}
