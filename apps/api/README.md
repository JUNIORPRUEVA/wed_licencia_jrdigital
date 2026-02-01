# License Core API (PostgreSQL + Prisma)

## 1) Configurar .env
- Copia [apps/api/.env.example](apps/api/.env.example) a `apps/api/.env`
- Completa `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_JWT_SECRET`, `ACTIVATION_JWT_SECRET`, `OFFLINE_ED25519_PRIVATE_KEY_B64`

## 2) Instalar dependencias
Desde la raíz del monorepo:
- `npm install`

## 3) Migraciones
- Local/dev: `npm -w apps/api run db:migrate:dev`
- Producción: `NODE_ENV=production npm -w apps/api run db:migrate`

## 4) Seed
- `npm -w apps/api run db:seed`

## 5) Verificar conexión
- `npm -w apps/api run db:studio`

Si falta una variable de entorno, los scripts fallan con un mensaje claro.
