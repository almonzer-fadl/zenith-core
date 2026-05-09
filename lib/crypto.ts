import crypto from "crypto";
const ALGO = "aes-256-gcm";
function keyFromSecret(secret: string) { return crypto.createHash("sha256").update(secret).digest(); }
export function encryptText(plain: string, secret: string) { const iv = crypto.randomBytes(12); const key = keyFromSecret(secret); const cipher = crypto.createCipheriv(ALGO, key, iv); const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]); const tag = cipher.getAuthTag(); return Buffer.concat([iv, tag, encrypted]).toString("base64"); }
export function decryptText(payload: string, secret: string) { const buf = Buffer.from(payload, "base64"); const iv = buf.subarray(0, 12); const tag = buf.subarray(12, 28); const data = buf.subarray(28); const key = keyFromSecret(secret); const decipher = crypto.createDecipheriv(ALGO, key, iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"); }
