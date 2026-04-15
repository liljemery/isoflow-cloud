# Despliegue en Railway (monorepo)

Un **solo servicio** construye y sirve **API + Studio (frontend)** con el [`Dockerfile`](apps/api/Dockerfile): etapa `web-build` (Vite) + imagen final (Fastify + estáticos en `/`, API bajo `/api`).

## Pasos

1. **Nuevo proyecto** → **Deploy from GitHub** → este repo.
2. **Root directory**: raíz del repo (`.`).
3. **PostgreSQL**: añade el plugin en el proyecto y enlaza `DATABASE_URL` al servicio.
4. **Variables**:
   - `DATABASE_URL`: debe apuntar al Postgres del proyecto (referencia del plugin).
   - `JWT_SECRET`: opcional pero recomendado. Si no lo defines, la API deriva un secreto estable a partir de `DATABASE_URL` para poder arrancar (evita caídas del healthcheck por variable faltante).
5. **Puerto**: Railway inyecta `PORT`; no hace falta fijar `4000`.

En cada push al repo, Railway redeploya **este único servicio** ([`watchPatterns`: `**`](railway.json): cambios en `apps/web`, `apps/api`, `src`, etc.). Si tenías **otro servicio solo frontend** en el mismo proyecto, bórralo para no duplicar coste y tráfico; la app Studio ya va dentro de este despliegue.

## Comportamiento

- **SPA + API mismo origen**: el navegador usa `VITE_API_BASE=/api` (por defecto); las rutas reales son `/api/auth/...`, `/api/projects/...`.
- **`/health`**: comprobación de vida para Railway (sin prefijo `/api`).
- **Migraciones (Railway)**: [`railway.json`](railway.json) define `preDeployCommand` (migraciones **antes** de levantar el nuevo contenedor). El **Dockerfile** solo hace `CMD ["node","dist/index.js"]` para que el proceso **abra el puerto al instante**; si el `CMD` ejecutara `migrate && node`, la migración bloquearía el servidor y el **healthcheck** fallaría con *service unavailable* hasta que terminara. En local, **Docker Compose** sobrescribe con `command: … migrate && node …`.
- **Healthcheck `/health`**: Railway lo usa para saber si el servicio **ya responde HTTP** y marcar el despliegue como sano. No tiene que ver con Prisma; falla si **nada escucha** en `PORT` (p. ej. migración corriendo en el mismo proceso que debería levantar Fastify).

## Desarrollo local

- API: `cd apps/api && npm run dev` — rutas en `/api/...`.
- Web: `cd apps/web && npm run dev` — proxy de Vite envía `/api` al backend **sin** quitar el prefijo.

## Docker Compose

El servicio `api` en [`docker-compose.yml`](docker-compose.yml) usa el mismo Dockerfile (incluye build del frontend).

## Healthcheck falla (503 / service unavailable)

1. Confirma en los logs del build que aparece la etapa **`web-build`** (Dockerfile de `apps/api`). Si ves solo **nginx** o **pnpm** desde la raíz, el servicio está usando el `Dockerfile` equivocado: el repo debe incluir [`railway.json`](railway.json) y el servicio debe construir desde [`apps/api/Dockerfile`](apps/api/Dockerfile).
2. `DATABASE_URL` debe estar **referenciada** al Postgres del mismo proyecto (Variables → referencia al plugin).
3. Revisa los **deploy logs** del contenedor: errores de Prisma/migraciones o fallos al hacer `listen` impiden que `/health` responda.
4. **`startCommand` y cwd**: Railway a veces ejecuta el comando desde la raíz del repo, no desde el `WORKDIR` de la imagen. Por eso el arranque usa `cd /repo/apps/api && node dist/index.js` (en [`railway.json`](railway.json) y en el [`Dockerfile`](apps/api/Dockerfile)). Si `node dist/index.js` se lanza sin ese `cd`, el proceso puede salir al instante y el healthcheck falla siempre.
