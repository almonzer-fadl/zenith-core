import { z } from "zod";
import { handleApiError, ok, ApiError } from "@/lib/api";
import { issueAccessToken, issueRefreshToken, verifyAppPassword } from "@/lib/auth";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const isValid = await verifyAppPassword(body.password);

    if (!isValid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    const userId = "owner";
    const accessToken = await issueAccessToken(userId);
    const refreshToken = await issueRefreshToken(userId, {
      userAgent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for"),
    });

    return ok({ accessToken, refreshToken, tokenType: "Bearer", userId });
  } catch (error) {
    return handleApiError(error);
  }
}
