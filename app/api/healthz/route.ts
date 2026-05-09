import { getDb } from "@/db";
import { ok, handleApiError } from "@/lib/api";
import { getRequestId } from "@/lib/observability";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return ok({ status: "ok", db: "up", timestamp: new Date().toISOString() }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
