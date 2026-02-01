# FULLTECH Licensing (PWA + API)

Monorepo listo para:
- Web pública (landing + catálogo + páginas de producto + descargas DEMO)
- Backoffice con login (productos, tenants, órdenes, licencias, activaciones, auditoría, settings)
- Activación ONLINE (token firmado) y OFFLINE por archivo (license file firmado Ed25519)

## Requisitos
- Node.js 20+
- PostgreSQL (cloud o local)

## Variables de entorno
- API: ver [apps/api/.env.example](apps/api/.env.example)
- WEB: crea `apps/web/.env.local` con `NEXT_PUBLIC_API_URL`.

## Correr local
1) Instalar dependencias en la raíz:
- `npm install`

2) Configurar API:
- Copia `apps/api/.env.example` a `apps/api/.env` y ajusta `DATABASE_URL`.
- Genera una key Ed25519 (32 bytes base64) para `OFFLINE_ED25519_PRIVATE_KEY_B64`.

3) Prisma:
- `npm run db:migrate`
- `npm run db:seed`

4) Levantar todo:
- `npm run dev`

API: `http://localhost:4000`  
WEB: `http://localhost:3000`

## Rotación de keys (offline)
- Cambia `OFFLINE_ED25519_PRIVATE_KEY_B64`.
- Publica el nuevo `PUBLIC_KEY` (la UI del backoffice lo mostrará) y versiona el cambio en tus apps cliente.

## Pagos (Fase 2)
La tabla `Payment` y los endpoints relacionados se dejarán como stubs para integrar Stripe/PayPal u otro proveedor.
