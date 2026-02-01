import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),

  // Admin seed
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),

  // Auth + tokens
  AUTH_JWT_SECRET: z.string().min(32),
  AUTH_ACCESS_TTL_MIN: z.coerce.number().int().positive().default(30),
  AUTH_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  ACTIVATION_JWT_SECRET: z.string().min(32),

  // Cookies
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_DOMAIN: z.string().optional(),

  // Offline signing
  OFFLINE_ED25519_PRIVATE_KEY_B64: z.string().min(32),
});

export const env = EnvSchema.parse(process.env);
