import crypto from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { collections } from "@/db/collections";

const encoder = new TextEncoder();
const accessSecret = encoder.encode(env.AUTH_SECRET);

interface AccessPayload {
  sub: string;
  type: "access";
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function verifyAppPassword(password: string) {
  return password === env.APP_PASSWORD;
}

export async function issueAccessToken(userId: string) {
  return new SignJWT({ type: "access" } satisfies Omit<AccessPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (payload.type !== "access" || typeof payload.sub !== "string") {
      throw new ApiError(401, "INVALID_TOKEN", "Invalid access token");
    }
    return { userId: payload.sub };
  } catch {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired access token");
  }
}

export async function issueRefreshToken(userId: string, meta?: { userAgent?: string | null; ip?: string | null }) {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(rawToken);
  const c = await collections();

  await c.refreshTokens.insertOne({
    userId,
    tokenHash,
    expiresAt: new Date((nowSeconds() + env.REFRESH_TOKEN_TTL_SECONDS) * 1000),
    revokedAt: null,
    userAgent: meta?.userAgent ?? null,
    ip: meta?.ip ?? null,
    createdAt: new Date(),
  });

  return rawToken;
}

export async function rotateRefreshToken(rawToken: string, meta?: { userAgent?: string | null; ip?: string | null }) {
  const c = await collections();
  const tokenHash = hashToken(rawToken);
  const doc = await c.refreshTokens.findOne({ tokenHash });

  if (!doc || doc.revokedAt || doc.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, "INVALID_REFRESH", "Invalid refresh token");
  }

  await c.refreshTokens.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });

  const accessToken = await issueAccessToken(doc.userId);
  const refreshToken = await issueRefreshToken(doc.userId, meta);

  return { accessToken, refreshToken, userId: doc.userId };
}

export async function revokeRefreshToken(rawToken: string) {
  const c = await collections();
  const tokenHash = hashToken(rawToken);
  await c.refreshTokens.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
}

export async function requireBearerUserId(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new ApiError(401, "MISSING_AUTH", "Missing Bearer token");
  }

  const token = auth.slice(7).trim();
  if (!token) {
    throw new ApiError(401, "MISSING_AUTH", "Missing Bearer token");
  }

  const { userId } = await verifyAccessToken(token);
  return userId;
}
