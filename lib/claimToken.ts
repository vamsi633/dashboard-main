// lib/claimToken.ts
import crypto from "crypto";

export function generateClaimToken() {
  // 24 bytes => 48 hex chars, plenty
  return `ct_${crypto.randomBytes(24).toString("hex")}`;
}
