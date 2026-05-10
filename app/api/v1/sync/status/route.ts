import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { collections } from "@/db/collections";
import { getRequestId } from "@/lib/observability";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const c = await collections();

    const latestSuccess = await c.idempotencyKeys
      .find({ userId, response: { $ne: null } })
      .sort({ updatedAt: -1 })
      .limit(1)
      .toArray();

    const pendingCount = await c.idempotencyKeys.countDocuments({ userId, response: null });

    return ok({
      lastSuccessAt: latestSuccess[0]?.updatedAt ?? null,
      pendingCount,
      failedCount: 0,
    }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
