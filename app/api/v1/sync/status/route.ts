import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";
import { collections } from "@/db/collections";

export async function GET(request: Request) {
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
      last_success_at: latestSuccess[0]?.updatedAt ?? null,
      pending_count: pendingCount,
      failed_count: 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
