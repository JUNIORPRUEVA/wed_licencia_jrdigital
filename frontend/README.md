# Frontend (Next.js)

La UI pública y el backoffice comparten este frontend construido con Next.js App Router.

## Variables de entorno
- `frontend/.env.local`: define `NEXT_PUBLIC_API_URL`. Durante el desarrollo puede quedarse en `http://localhost:4000`.

## Scripts (desde la raíz)
- `npm run dev`: levanta el backend y frontend juntos (usa `npm -w frontend run dev` internamente).
- `npm run build`: compila backend y frontend para producción.
- `npm run lint`: ejecuta el lint del frontend.

El trabajo diario normalmente se hace desde la raíz para aprovechar los workspaces (las dependencias se instalan con `npm install`).
