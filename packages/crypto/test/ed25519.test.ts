import { describe, expect, it } from "vitest";
import {
  ed25519GetPublicKeyBase64,
  ed25519SignBase64,
  ed25519VerifyBase64,
} from "../src/ed25519";

function randomPrivateKeyBase64(): string {
  // noble/ed25519 expects 32-byte private key (seed)
  const seed = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(seed).toString("base64");
}

describe("ed25519", () => {
  it("sign/verify works", async () => {
    const priv = randomPrivateKeyBase64();
    const pub = await ed25519GetPublicKeyBase64(priv);
    const payload = new TextEncoder().encode("hello");

    const sig = await ed25519SignBase64(payload, priv);
    const ok = await ed25519VerifyBase64(payload, sig, pub);
    expect(ok).toBe(true);
  });
});
