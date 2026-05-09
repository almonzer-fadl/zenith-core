import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId, revokeSessionById } from "@/lib/auth";
import { getRequestId } from "@/lib/observability";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const userId = await requireBearerUserId(request);
    const { id } = await params;
    if (!id) throw new ApiError(400, "INVALID_ID", "Session id required");
    await revokeSessionById(userId, id);
    return ok({ revoked: true }, 200, requestId);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
