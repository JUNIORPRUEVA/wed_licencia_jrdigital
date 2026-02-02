# Frontend Dockerfile for Easypanel
FROM node:20-bookworm-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/shared/package.json ./packages/shared/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm ci --workspace=web --workspace=@fulltech/shared --workspace=@fulltech/crypto

# Build frontend
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/packages ./packages

# Copy source code
COPY frontend ./frontend
COPY packages ./packages
COPY tsconfig.base.json ./

WORKDIR /app/frontend

# Build Next.js app
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
