import crypto from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { collections } from "@/db/collections";

const encoder = new TextEncoder();
const accessSecret = encoder.encode(env.AUTH_SECRET);

function hashToken(raw: string) { return crypto.createHash("sha256").update(raw).digest("hex"); }

export async function verifyUserCredentials(email: string, password: string) {
  const c = await collections();
  const user = await c.users.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export async function createUser(email: string, password: string, role: "owner" | "member" = "member") {
  const c = await collections();
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await c.users.insertOne({ userId: "system", email: email.toLowerCase(), passwordHash, role, isActive: true, createdAt: now, updatedAt: now });
  return result.insertedId.toString();
}

export async function issueAccessToken(userId: string) {
  return new SignJWT({ type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (payload.type !== "access" || typeof payload.sub !== "string") throw new ApiError(401, "INVALID_TOKEN", "Invalid access token");
    return { userId: payload.sub };
  } catch {
    throw new ApiError(401, "INVALID_TOKEN", "Invalid or expired access token");
  }
}

export async function issueRefreshToken(userId: string, meta?: { userAgent?: string | null; ip?: string | null; deviceName?: string | null }) {
  const rawToken = crypto.randomBytes(48).toString("hex");
  const refreshTokenHash = hashToken(rawToken);
  const c = await collections();
  const now = new Date();

  await c.sessions.insertOne({
    userId,
    refreshTokenHash,
    deviceName: meta?.deviceName ?? null,
    userAgent: meta?.userAgent ?? null,
    ip: meta?.ip ?? null,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000),
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return rawToken;
}

export async function rotateRefreshToken(rawToken: string, meta?: { userAgent?: string | null; ip?: string | null; deviceName?: string | null }) {
  const c = await collections();
  const refreshTokenHash = hashToken(rawToken);
  const session = await c.sessions.findOne({ refreshTokenHash });

  if (!session) throw new ApiError(401, "INVALID_REFRESH", "Invalid refresh token");
  if (session.expiresAt.getTime() < Date.now()) throw new ApiError(401, "EXPIRED_REFRESH", "Refresh token expired");

  if (session.revokedAt) {
    await c.sessions.updateMany({ userId: session.userId, revokedAt: null }, { $set: { revokedAt: new Date(), updatedAt: new Date() } });
    throw new ApiError(401, "REFRESH_REUSE_DETECTED", "Session compromised, all sessions revoked");
  }

  await c.sessions.updateOne({ _id: session._id }, { $set: { revokedAt: new Date(), updatedAt: new Date() } });

  const accessToken = await issueAccessToken(session.userId);
  const refreshToken = await issueRefreshToken(session.userId, meta);
  return { accessToken, refreshToken, userId: session.userId };
}

export async function revokeRefreshToken(rawToken: string) {
  const c = await collections();
  const refreshTokenHash = hashToken(rawToken);
  await c.sessions.updateOne({ refreshTokenHash }, { $set: { revokedAt: new Date(), updatedAt: new Date() } });
}

export async function revokeSessionById(userId: string, sessionId: string) {
  const c = await collections();
  await c.sessions.updateOne({ _id: new (await import("mongodb")).ObjectId(sessionId), userId }, { $set: { revokedAt: new Date(), updatedAt: new Date() } });
}

export async function listUserSessions(userId: string) {
  const c = await collections();
  return c.sessions.find({ userId }).sort({ createdAt: -1 }).limit(50).toArray();
}

export async function requireBearerUserId(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new ApiError(401, "MISSING_AUTH", "Missing Bearer token");
  const token = auth.slice(7).trim();
  if (!token) throw new ApiError(401, "MISSING_AUTH", "Missing Bearer token");
  const { userId } = await verifyAccessToken(token);
  return userId;
}
