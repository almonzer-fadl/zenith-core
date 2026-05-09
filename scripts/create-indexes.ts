import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { ensureIndexes } = await import("@/db/indexes");
  await ensureIndexes();
  console.log("Indexes ensured");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
