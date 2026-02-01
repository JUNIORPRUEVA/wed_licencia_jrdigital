import { nanoid } from "nanoid";
import { sha256Hex } from "@fulltech/crypto";

export function newRefreshTokenRaw() {
  return `rt_${nanoid(48)}`;
}

export function hashRefreshToken(raw: string) {
  return sha256Hex(raw);
}
