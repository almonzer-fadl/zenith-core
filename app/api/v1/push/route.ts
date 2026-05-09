import { z } from "zod";
import webpush from "web-push";
import { collections } from "@/db/collections";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireBearerUserId } from "@/lib/auth";

const schema = z.object({ subscription: z.object({ endpoint: z.string().url() }).passthrough() });

function configure() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new ApiError(500, "MISSING_VAPID", "Missing VAPID keys");
  webpush.setVapidDetails("mailto:zenith@local", pub, priv);
}

export async function POST(request: Request) {
  try {
    configure();
    const userId = await requireBearerUserId(request);
    const body = schema.parse(await request.json());
    const now = new Date();
    const c = await collections();
    await c.pushSubscriptions.deleteMany({ userId });
    await c.pushSubscriptions.insertOne({ userId, endpoint: body.subscription.endpoint, subscription: body.subscription, createdAt: now, updatedAt: now });
    return ok({ saved: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    configure();
    const userId = await requireBearerUserId(request);
    const c = await collections();
    await c.pushSubscriptions.deleteMany({ userId });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
