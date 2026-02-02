# FULLTECH Licensing (PWA + API)

Monorepo listo para:
- Web pública (landing, catálogo, páginas de producto, descargas DEMO)
- Backoffice administrativo con login (productos, tenants, órdenes, licencias, activaciones, auditoría, settings)
- Activación ONLINE (token JWT) y OFFLINE (archivo firmado con Ed25519)

## Requisitos
- Node.js 20+
- PostgreSQL (cloud o local)

## Variables de entorno
- API: revisa `backend/.env.example` y crea `backend/.env`
- WEB: crea `frontend/.env.local` y configura `NEXT_PUBLIC_API_URL`

## Correr local
1. Instalar dependencias desde la raíz: `npm install`
2. Backend:
   - Copia `backend/.env.example` a `backend/.env` y completa `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_JWT_SECRET`, `ACTIVATION_JWT_SECRET` y `OFFLINE_ED25519_PRIVATE_KEY_B64`.
   - Ejecuta `npm run db:migrate` y `npm run db:seed`.
3. Ejecutar ambos servicios simultáneamente: `npm run dev`

   - API: `http://localhost:4000`
   - UI pública/backoffice: `http://localhost:3000`

## Rotación de keys (offline)
- Cambia `OFFLINE_ED25519_PRIVATE_KEY_B64` en `backend/.env`.
- Publica el nuevo `PUBLIC_KEY` en los clientes para que puedan verificar archivos offline.

## Pagos (Fase 2)
La tabla `Payment` y los endpoints relacionados se dejan como stubs listos para integrar Stripe, PayPal u otro proveedor.
