import { handleApiError, ok } from "@/lib/api";
import { listUserSessions, requireBearerUserId } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const sessions = await listUserSessions(userId);
    return ok({ items: sessions }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
