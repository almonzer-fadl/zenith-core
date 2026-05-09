import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const userId = await requireBearerUserId(request);
    return ok({ userId });
  } catch (error) {
    return handleApiError(error);
  }
}
