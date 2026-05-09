import assert from "node:assert/strict";
import { decryptText, encryptText } from "@/lib/crypto";

const secret = "super-secret-key-material";
const plain = "sensitive-note";
const enc = encryptText(plain, secret);
assert.notEqual(enc, plain);
assert.equal(decryptText(enc, secret), plain);
console.log("unit-crypto passed");
