# Backend Dockerfile for Easypanel
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/

# Install dependencies
RUN npm ci --workspace=backend --workspace=@fulltech/crypto --workspace=@fulltech/shared

# Build packages and backend
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY backend ./backend
COPY packages ./packages
COPY tsconfig.base.json ./

# Generate Prisma Client
WORKDIR /app/backend
RUN npx prisma generate

# Build backend
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/packages ./packages

WORKDIR /app/backend

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
	CMD wget -qO- http://127.0.0.1:4000/health > /dev/null || exit 1

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx dist/src/index.js"]
