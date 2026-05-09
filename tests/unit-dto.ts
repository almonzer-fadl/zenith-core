import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { normalizeDoc } from "@/lib/dto";

const now = new Date("2026-01-01T00:00:00.000Z");
const doc = { _id: new ObjectId(), timestamp: now, nested: { at: now } };
const out = normalizeDoc(doc) as unknown as { id?: string; loggedAt?: string; nested: { at: string } };
assert.ok(out.id);
assert.equal(out.loggedAt, now.toISOString());
assert.equal(out.nested.at, now.toISOString());
console.log("unit-dto passed");
