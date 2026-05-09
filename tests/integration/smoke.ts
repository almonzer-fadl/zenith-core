import { readFileSync, existsSync } from "fs";

const required = [
  "app/api/v1/auth/login/route.ts",
  "app/api/v1/auth/refresh/route.ts",
  "app/api/v1/health/route.ts",
  "app/api/v1/money/route.ts",
  "app/api/v1/biometrics/route.ts",
  "app/api/openapi/route.ts",
  "openapi.json"
];

for (const path of required) {
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
}

const openapi = JSON.parse(readFileSync("openapi.json", "utf8")) as { openapi?: string };
if (!openapi.openapi) {
  throw new Error("Invalid openapi.json");
}

console.log("Integration smoke checks passed");
