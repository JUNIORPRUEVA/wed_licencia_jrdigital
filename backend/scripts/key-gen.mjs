import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { randomBytes } from 'crypto';

ed.utils.sha512 = sha512;

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const privateKeyBytes = randomBytes(32);
const privateKeyHex = bytesToHex(privateKeyBytes);
const publicKeyBytes = await ed.getPublicKey(privateKeyBytes);
const publicKeyHex = bytesToHex(publicKeyBytes);

console.log(`SIGN_PRIVATE_KEY=${privateKeyHex}`);
console.log(`SIGN_PUBLIC_KEY=${publicKeyHex}`);
