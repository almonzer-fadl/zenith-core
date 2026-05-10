import { existsSync, readFileSync } from "fs";

const requiredFiles = [
  "app/api/v1/profile/route.ts",
  "app/api/v1/reminders/rules/route.ts",
  "app/api/v1/reminders/rules/[id]/route.ts",
  "app/api/v1/reminders/events/route.ts",
  "app/api/v1/reminders/adherence/route.ts",
  "app/api/v1/sync/status/route.ts",
  "lib/conflict.ts"
];

for (const path of requiredFiles) {
  if (!existsSync(path)) {
    throw new Error(`Missing required implementation file: ${path}`);
  }
}

const openapi = JSON.parse(readFileSync("openapi.json", "utf8")) as {
  paths?: Record<string, unknown>;
};

const requiredPaths = [
  "/api/v1/profile",
  "/api/v1/reminders/rules",
  "/api/v1/reminders/rules/{id}",
  "/api/v1/reminders/events",
  "/api/v1/reminders/adherence",
  "/api/v1/sync/status"
];

for (const path of requiredPaths) {
  const normalized = path.replace("{id}", "[id]");
  const hasRouteFile = existsSync(`app${normalized}/route.ts`);
  if (!openapi.paths?.[path] && !hasRouteFile) {
    throw new Error(`OpenAPI path missing: ${path}`);
  }
}

const moneyUpdateSource = readFileSync("app/api/v1/money/[id]/route.ts", "utf8");
if (!moneyUpdateSource.includes("expectedUpdatedAt")) {
  throw new Error("Conflict contract check failed for money update route");
}

const healthUpdateSource = readFileSync("app/api/v1/health/[id]/route.ts", "utf8");
if (!healthUpdateSource.includes("expectedUpdatedAt")) {
  throw new Error("Conflict contract check failed for health update route");
}

const reliabilityRoutes = [
  "app/api/v1/biometrics/[id]/route.ts",
  "app/api/v1/telemetry/[id]/route.ts",
  "app/api/v1/nutrition/[id]/route.ts",
  "app/api/v1/sleep/[id]/route.ts",
  "app/api/v1/reminders/rules/[id]/route.ts",
];

for (const routePath of reliabilityRoutes) {
  const source = readFileSync(routePath, "utf8");
  if (!source.includes("expectedUpdatedAt")) {
    throw new Error(`Reliability contract check failed: missing expectedUpdatedAt in ${routePath}`);
  }
  if (!source.includes("auditLog(")) {
    throw new Error(`Reliability contract check failed: missing auditLog usage in ${routePath}`);
  }
}

const sensitiveAuditRoutes = [
  "app/api/v1/profile/route.ts",
  "app/api/v1/reminders/rules/route.ts",
  "app/api/v1/reminders/events/route.ts",
  "app/api/v1/push/route.ts",
  "app/api/v1/notifications/trigger/route.ts",
  "app/api/v1/auth/logout/route.ts",
  "app/api/v1/sessions/[id]/route.ts",
  "app/api/v1/athletic/[id]/route.ts",
];

for (const routePath of sensitiveAuditRoutes) {
  const source = readFileSync(routePath, "utf8");
  if (!source.includes("auditLog(")) {
    throw new Error(`Audit coverage check failed: missing auditLog usage in ${routePath}`);
  }
}

const reportsSource = readFileSync("app/api/v1/reports/route.ts", "utf8");
const requiredReportFields = ["metrics", "comparisons", "insights", "drivers", "windowDays"];
for (const field of requiredReportFields) {
  if (!reportsSource.includes(field)) {
    throw new Error(`Reports contract check failed: missing ${field}`);
  }
}

console.log("Integration contract checks passed");
