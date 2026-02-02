# Frontend Dockerfile for Easypanel
FROM node:20-bookworm-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Force dev + optional deps during build (Easypanel may set NODE_ENV=production)
ENV NODE_ENV=development \
    npm_config_ignore_scripts=false \
    npm_config_optional=true

# Some CI/build environments set ignore-scripts=true, which breaks native deps like lightningcss.

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/shared/package.json ./packages/shared/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install --include=dev --include=optional --no-audit --no-fund --workspace=web --workspace=@fulltech/shared --workspace=@fulltech/crypto

# Ensure native bindings are present (lightningcss ships platform-specific binaries)
# Some build environments end up without the platform package even with optional deps enabled.
ARG LIGHTNINGCSS_VERSION=1.30.2
RUN set -eu; \
    os="$(node -p "process.platform")"; \
    arch="$(node -p "process.arch")"; \
    libc_raw="$(node -e "const { familySync } = require('detect-libc'); const v = (familySync && familySync()) || 'glibc'; process.stdout.write(String(v));")"; \
    case "$libc_raw" in \
      glibc|gnu) libc="gnu" ;; \
      musl) libc="musl" ;; \
      *) libc="gnu" ;; \
    esac; \
    pkg="lightningcss-${os}-${arch}-${libc}"; \
    file="lightningcss.${os}-${arch}-${libc}.node"; \
    echo "Using lightningcss platform package: $pkg@$LIGHTNINGCSS_VERSION"; \
    npm -w web install --no-save --no-audit --no-fund "${pkg}@${LIGHTNINGCSS_VERSION}"; \
    found=$(find node_modules frontend/node_modules -name "$file" -print -quit || true); \
    if [ -z "$found" ]; then echo "Missing lightningcss native file: $file"; exit 1; fi; \
    cp "$found" "frontend/node_modules/lightningcss/$file"; \
    npm -w web rebuild lightningcss --foreground-scripts

# Sanity-check native optional deps (fails fast if the Linux binary wasn't installed)
RUN cd frontend && node -e "require('lightningcss')"

# Build frontend
FROM base AS builder
WORKDIR /app

# Build-time args (Easypanel provides these as --build-arg)
ARG NEXT_PUBLIC_API_URL
ARG API_PROXY_TARGET
ARG PORT=3000
ARG GIT_SHA

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_PROXY_TARGET=$API_PROXY_TARGET
ENV PORT=$PORT
ENV NEXT_TELEMETRY_DISABLED=1

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
ENV NEXT_TELEMETRY_DISABLED=1

ARG PORT=3000

# Create user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=$PORT
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
