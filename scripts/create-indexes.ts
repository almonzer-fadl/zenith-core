import "dotenv/config";
import { ensureIndexes } from "@/db/indexes";

async function main() {
  await ensureIndexes();
  console.log("Indexes ensured");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
