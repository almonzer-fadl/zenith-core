import { z } from "zod";
import { collections } from "@/db/collections";
import { handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";

const schema = z.object({ juzNumber: z.union([z.string(), z.number()]), surahNumber: z.union([z.string(), z.number()]).nullable().optional(), status: z.string().min(1) });

export async function GET(request: Request) { try { const userId = await requireBearerUserId(request); const c = await collections(); const items = await c.quranMemorization.find({ userId }).sort({ updatedAt: -1 }).limit(100).toArray(); return ok({ items }); } catch (error) { return handleApiError(error); } }
export async function POST(request: Request) { try { const userId = await requireBearerUserId(request); const body = schema.parse(await request.json()); const now = new Date(); const doc = { userId, juzNumber: Number(body.juzNumber), surahNumber: body.surahNumber == null ? null : Number(body.surahNumber), status: body.status, createdAt: now, updatedAt: now }; const c = await collections(); const result = await c.quranMemorization.insertOne(doc); return ok({ id: result.insertedId.toString(), ...doc }, 201); } catch (error) { return handleApiError(error); } }
