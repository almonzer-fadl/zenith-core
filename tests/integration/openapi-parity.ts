import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const root = "app/api/v1";
const openapi = JSON.parse(readFileSync("openapi.json", "utf8")) as {
  paths?: Record<string, Record<string, unknown>>;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

function toOpenApiPath(routeFile: string): string {
  const rel = relative(root, routeFile).replace(/\/route\.ts$/, "");
  const withParams = rel.replace(/\[([^\]]+)\]/g, "{$1}");
  return `/api/v1/${withParams}`.replace(/\/+/g, "/");
}

const routeFiles = walk(root);
const missingPaths: string[] = [];
const missingMethods: string[] = [];

for (const file of routeFiles) {
  const openapiPath = toOpenApiPath(file);
  const source = readFileSync(file, "utf8");
  const methods = Array.from(source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)).map((m) =>
    m[1].toLowerCase()
  );
  const pathItem = openapi.paths?.[openapiPath];
  if (!pathItem) {
    missingPaths.push(openapiPath);
    continue;
  }
  for (const method of methods) {
    if (!pathItem[method]) {
      missingMethods.push(`${method.toUpperCase()} ${openapiPath}`);
    }
  }
}

if (missingPaths.length > 0) {
  throw new Error(`OpenAPI missing paths:\\n${missingPaths.join("\\n")}`);
}
if (missingMethods.length > 0) {
  throw new Error(`OpenAPI missing methods:\\n${missingMethods.join("\\n")}`);
}

console.log("OpenAPI parity checks passed");
