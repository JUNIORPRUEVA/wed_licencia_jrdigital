import * as ed from "@noble/ed25519";
import { base64ToBytes, bytesToBase64 } from "./encoding";

export async function ed25519SignBase64(
  payload: Uint8Array,
  privateKeyBase64: string
): Promise<string> {
  const priv = base64ToBytes(privateKeyBase64);
  const sig = await ed.sign(payload, priv);
  return bytesToBase64(sig);
}

export async function ed25519VerifyBase64(
  payload: Uint8Array,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  const sig = base64ToBytes(signatureBase64);
  const pub = base64ToBytes(publicKeyBase64);
  return ed.verify(sig, payload, pub);
}

export async function ed25519GetPublicKeyBase64(
  privateKeyBase64: string
): Promise<string> {
  const priv = base64ToBytes(privateKeyBase64);
  const pub = await ed.getPublicKey(priv);
  return bytesToBase64(pub);
}
