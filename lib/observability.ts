import { randomUUID } from "crypto";
export function getRequestId(request: Request) { return request.headers.get("x-request-id") || randomUUID(); }
export function logInfo(event: string, data: Record<string, unknown>) { console.log(JSON.stringify({ level: "info", event, ...data })); }
export function logError(event: string, data: Record<string, unknown>) { console.error(JSON.stringify({ level: "error", event, ...data })); }
