import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { revokeRefreshToken } from "@/lib/auth";

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = logoutSchema.parse(await request.json());
    await revokeRefreshToken(body.refreshToken);
    return ok({ revoked: true });
  } catch (error) {
    return handleApiError(error);
  }
}
