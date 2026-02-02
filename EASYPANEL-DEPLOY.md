# Guía de Deployment en Easypanel

## Configuración de 2 Servicios Separados

### 1️⃣ Backend API (Puerto 4000)

**En Easypanel:**
1. Crear nuevo servicio → Desde Git Repository
2. Conectar tu repositorio Git
3. **Build Settings:**
   - **Build Context:** `/` (raíz del monorepo)
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Build Arguments:** (ninguno necesario)

4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ADMIN_EMAIL=admin@fulltech.local
   ADMIN_PASSWORD=Admin123!
   AUTH_JWT_SECRET=tu-auth-jwt-secret-minimo-32-caracteres
   ACTIVATION_JWT_SECRET=tu-activation-jwt-secret-minimo-32-caracteres
   AUTH_ACCESS_TTL_MIN=30
   AUTH_REFRESH_TTL_DAYS=30
   COOKIE_SECURE=true
   # COOKIE_DOMAIN=.midominio.com
   OFFLINE_ED25519_PRIVATE_KEY_B64=tu-clave-privada-ed25519-base64
   ```

5. **Port Mapping:**
   - Container Port: `4000`
   - Expose: ✅ Sí

6. **Database:**
   - Crear servicio PostgreSQL separado en Easypanel
   - Copiar DATABASE_URL y pegarlo en las variables de entorno

---

### 2️⃣ Frontend (Puerto 3000)

**En Easypanel:**
1. Crear nuevo servicio → Desde Git Repository
2. Conectar el MISMO repositorio Git
3. **Build Settings:**
   - **Build Context:** `/` (raíz del monorepo)
   - **Dockerfile Path:** `frontend/Dockerfile`
   - **Build Arguments:** (ninguno necesario)

4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3000
   NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
   API_PROXY_TARGET=https://api-backend.easypanel.host
   ```

5. **Port Mapping:**
   - Container Port: `3000`
   - Expose: ✅ Sí
   - Domain: Tu dominio custom

---

## 📋 Checklist de Deployment

### Antes de deployar:
- [ ] Git push de todos los cambios
- [ ] Verificar que Dockerfiles están en `backend/` y `frontend/`
- [ ] Crear base de datos PostgreSQL en Easypanel
- [ ] Generar JWT secrets: `openssl rand -base64 32`
- [ ] Generar claves Ed25519 (si usas licencias offline)

### Orden de deployment:
1. **Primero:** Database (PostgreSQL)
2. **Segundo:** Backend API
3. **Tercero:** Frontend

### Después del primer deploy:
- [ ] Verificar logs del backend (migrations ejecutadas)
- [ ] Verificar que backend responde: `https://api.easypanel.host/health`
- [ ] Verificar que frontend carga correctamente
- [ ] Probar login/autenticación

---

## 🔧 Variables de Entorno Completas

### Backend (.env en Easypanel):
```bash
# Node
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://user:pass@postgres-service:5432/fulltech

# Admin seed
ADMIN_EMAIL=admin@fulltech.local
ADMIN_PASSWORD=Admin123!

# Auth + tokens
AUTH_JWT_SECRET=tu-auth-jwt-secret-minimo-32-caracteres
ACTIVATION_JWT_SECRET=tu-activation-jwt-secret-minimo-32-caracteres
AUTH_ACCESS_TTL_MIN=30
AUTH_REFRESH_TTL_DAYS=30

# Cookies
COOKIE_SECURE=true
# COOKIE_DOMAIN=.midominio.com

# Offline signing
OFFLINE_ED25519_PRIVATE_KEY_B64=tu-clave-privada-ed25519-base64
```

### Frontend (.env en Easypanel):
```bash
NODE_ENV=production
PORT=3000

# API Proxy (interno)
API_PROXY_TARGET=https://backend-service.easypanel.host

# API Pública (para el navegador)
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com
```

---

## 🚀 Comandos Útiles

### Generar JWT Secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Generar Claves Ed25519 (offline licensing):
```bash
npm run keygen
# o directamente:
node backend/scripts/key-gen.mjs
```

### Probar build local del backend:
```bash
docker build -f backend/Dockerfile -t fulltech-backend .
docker run -p 4000:4000 --env-file backend/.env fulltech-backend
```

### Probar build local del frontend:
```bash
docker build -f frontend/Dockerfile -t fulltech-frontend .
docker run -p 3000:3000 fulltech-frontend
```

---

## 🔍 Troubleshooting

### Backend no inicia:
- Verificar DATABASE_URL es correcta
- Verificar migrations: logs deben mostrar "prisma migrate deploy"
- Verificar que puerto 4000 esté expuesto

### Frontend no conecta al backend:
- Verificar API_PROXY_TARGET apunta al servicio backend
- Verificar CORS_ORIGIN en backend incluye dominio del frontend
- Verificar rewrites en next.config.ts

### Error "Prisma Client not generated":
- El Dockerfile ya incluye `npx prisma generate`
- Verificar que build se completó sin errores

---

## 📦 Estructura Final en Easypanel

```
Tu Proyecto
├── 📦 postgres-db (Service)
│   └── PostgreSQL 16
│
├── 🔧 backend-api (Service)
│   ├── Repository: tu-repo
│   ├── Dockerfile: backend/Dockerfile
│   └── Port: 4000
│
└── 🌐 frontend-web (Service)
    ├── Repository: tu-repo
    ├── Dockerfile: frontend/Dockerfile
    └── Port: 3000
```

---

## ✅ Deployment Completo

Una vez todo esté corriendo:
1. Backend API: `https://api.tu-dominio.com`
2. Frontend: `https://tu-dominio.com`
3. Database: Acceso interno solamente

¡Listo para producción! 🎉
