# Backend Dockerfile (Express + Prisma) for Easypanel
FROM node:20-bookworm-slim AS base

FROM base AS deps
WORKDIR /app

# Ensure native scripts can run if needed (prisma engines, bcrypt, etc)
ENV NODE_ENV=development \
    npm_config_ignore_scripts=false

COPY package.json package-lock.json ./
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/

RUN npm install --include=dev --no-audit --no-fund --workspace=@fulltech/api --workspace=@fulltech/shared --workspace=@fulltech/crypto

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages

COPY backend ./backend
COPY packages ./packages
COPY tsconfig.base.json ./

# Generate Prisma client and build TS
WORKDIR /app/backend
RUN npm run db:generate && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/prisma ./backend/prisma

USER nodejs

ARG PORT=4000
ENV PORT=$PORT
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT||4000) + '/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-lc", "cd backend && npx prisma migrate deploy && node dist/src/index.js"]

