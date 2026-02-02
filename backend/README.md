# License Core API (PostgreSQL + Prisma)

## 1) Configurar variables
- Copia `backend/.env.example` a `backend/.env` y llena `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_JWT_SECRET`, `ACTIVATION_JWT_SECRET` y `OFFLINE_ED25519_PRIVATE_KEY_B64`.

## 2) Dependencias
- Desde la raíz del mono-repo ejecuta `npm install`.

## 3) Migraciones y seed
- Desarrollo: `npm -w backend run db:migrate:dev`
- Producción: `NODE_ENV=production npm -w backend run db:migrate`
- Poblado inicial: `npm -w backend run db:seed`

## 4) Herramientas
- `npm -w backend run db:studio`

Si falta una variable el script arrojará un mensaje claro indicando qué falta.
