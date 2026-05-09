import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();
    const user = await c.users.findOne({ _id: new (await import("mongodb")).ObjectId(userId) });
    return ok({ userId, email: user?.email ?? null, role: user?.role ?? null }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
