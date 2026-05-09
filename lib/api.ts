import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.status, error.code, error.message);
  }

  console.error("Unhandled API error", error);
  return fail(500, "INTERNAL_ERROR", "Unexpected server error");
}
