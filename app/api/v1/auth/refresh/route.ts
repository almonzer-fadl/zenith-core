import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { rotateRefreshToken } from "@/lib/auth";

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = refreshSchema.parse(await request.json());
    const result = await rotateRefreshToken(body.refreshToken, {
      userAgent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for"),
    });

    return ok({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      tokenType: "Bearer",
      userId: result.userId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
