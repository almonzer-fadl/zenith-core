import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { getMonitoringSummary } = await import("@/lib/monitoring");
  const s = await getMonitoringSummary(60);
  const alerts: string[] = [];
  if (s.errorRate > 0.05) alerts.push(`High error rate: ${s.errorRate}`);
  if (s.p95DurationMs > 800) alerts.push(`High p95 latency: ${s.p95DurationMs}ms`);

  if (alerts.length === 0) {
    console.log("Monitoring OK", s);
    return;
  }

  console.error("Monitoring alerts:");
  for (const a of alerts) console.error(`- ${a}`);
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
