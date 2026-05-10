import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId, revokeSessionById } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";
import { auditLog } from "@/lib/audit";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Session id required");
    await revokeSessionById(userId, id);

    await auditLog({
      userId,
      action: "session.revoke",
      entity: "sessions",
      entityId: id,
      requestId,
      ip: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });

    return ok({ revoked: true }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
