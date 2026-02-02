import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

const encoder = new TextEncoder();

export type AccessTokenClaims = {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
};

export async function signAccessToken(claims: AccessTokenClaims) {
  const secret = encoder.encode(env.AUTH_JWT_SECRET);
  return new SignJWT({
    email: claims.email,
    role: claims.role,
    permissions: claims.permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer("fulltech-api")
    .setAudience("backoffice")
    .setIssuedAt()
    .setExpirationTime(`${env.AUTH_ACCESS_TTL_MIN}m`)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const secret = encoder.encode(env.AUTH_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    issuer: "fulltech-api",
    audience: "backoffice",
  });
  return payload;
}

export async function signActivationToken(claims: Record<string, unknown>, ttl: string) {
  const secret = encoder.encode(env.ACTIVATION_JWT_SECRET);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("fulltech-api")
    .setAudience("activation")
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secret);
}

export async function verifyActivationToken(token: string) {
  const secret = encoder.encode(env.ACTIVATION_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    issuer: "fulltech-api",
    audience: "activation",
  });
  return payload;
}
