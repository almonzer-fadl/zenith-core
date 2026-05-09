import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import bcrypt from "bcryptjs";

async function main() {
  const { collections } = await import("@/db/collections");
  const { env } = await import("@/lib/env");
  const c = await collections();
  const email = env.OWNER_EMAIL.toLowerCase();
  const exists = await c.users.findOne({ email });
  if (exists) {
    console.log("Owner already exists");
    return;
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(env.OWNER_PASSWORD, 12);
  await c.users.insertOne({ userId: "system", email, passwordHash, role: "owner", isActive: true, createdAt: now, updatedAt: now });
  console.log("Owner user created");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
