import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { getDb } = await import("@/db");
  const { ensureIndexes } = await import("@/db/indexes");

  const TARGET_VERSION = 1;
  const db = await getDb();
  const meta = db.collection<{ key: string; version: number; updatedAt: Date }>("schema_meta");
  const current = await meta.findOne({ key: "schema" });
  const currentVersion = current?.version ?? 0;

  if (currentVersion >= TARGET_VERSION) {
    console.log(`Schema already at version ${currentVersion}`);
    return;
  }

  await ensureIndexes();
  await meta.updateOne({ key: "schema" }, { $set: { version: TARGET_VERSION, updatedAt: new Date() } }, { upsert: true });
  console.log(`Migrated schema from ${currentVersion} to ${TARGET_VERSION}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
