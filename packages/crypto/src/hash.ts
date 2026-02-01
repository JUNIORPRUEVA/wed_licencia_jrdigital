import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "./encoding";

export function sha256Hex(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return bytesToHex(sha256(bytes));
}
