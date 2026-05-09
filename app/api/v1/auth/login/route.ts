import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { handleApiError, ok, ApiError } from "@/lib/api";
import { issueAccessToken, issueRefreshToken, verifyUserCredentials } from "@/lib/auth";
import { collections } from "@/db/collections";
import { env } from "@/lib/env";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/observability";
import { monitorResponse } from "@/lib/route-monitor";
import bcrypt from "bcryptjs";

const loginSchema = z.object({ email: z.string().email().optional(), password: z.string().min(1), deviceName: z.string().max(120).optional() });

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    await enforceRateLimit({ key: `login:${ip}`, windowSec: 60, max: 10 });
    const body = loginSchema.parse(await request.json());

    let user = body.email ? await verifyUserCredentials(body.email, body.password) : null;

    if (!user && !body.email && env.APP_PASSWORD && body.password === env.APP_PASSWORD) {
      const c = await collections();
      user = await c.users.findOne({ email: env.OWNER_EMAIL.toLowerCase() });
      if (!user) {
        const now = new Date();
        const passwordHash = await bcrypt.hash(env.OWNER_PASSWORD, 12);
        const result = await c.users.insertOne({ userId: "system", email: env.OWNER_EMAIL.toLowerCase(), passwordHash, role: "owner", isActive: true, createdAt: now, updatedAt: now });
        user = await c.users.findOne({ _id: result.insertedId });
      }
    }

    if (!user) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid credentials");

    const userId = user._id!.toString();
    const accessToken = await issueAccessToken(userId);
    const refreshToken = await issueRefreshToken(userId, { userAgent: request.headers.get("user-agent"), ip, deviceName: body.deviceName ?? null });

    await auditLog({ userId, action: "auth.login", entity: "session", requestId, ip, userAgent: request.headers.get("user-agent") });
    const response = ok({ accessToken, refreshToken, tokenType: "Bearer", userId, email: user.email, role: user.role }, 200, requestId);
    await monitorResponse({ startedAt, route: "/api/v1/auth/login", method: "POST", requestId, status: 200, userId });
    return response;
  } catch (error) {
    await monitorResponse({ startedAt, route: "/api/v1/auth/login", method: "POST", requestId, status: 500 });
    return handleApiError(error, requestId);
  }
}
