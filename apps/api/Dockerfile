FROM node:20-bookworm-slim AS web-build

WORKDIR /repo

COPY package.json package-lock.json ./
RUN npm ci

COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN cd apps/web && npm ci

COPY apps/web ./apps/web
COPY src ./src

RUN cd apps/web && npm run build

FROM node:20-bookworm-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY apps/api/package.json apps/api/package-lock.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY src/schemas ./src/schemas
COPY src/types ./src/types

RUN cd apps/api && npm ci

COPY apps/api ./apps/api

RUN cd apps/api && npm run build && npx prisma generate

COPY --from=web-build /repo/apps/web/dist ./apps/api/web/dist

WORKDIR /repo/apps/api

ENV NODE_ENV=production
EXPOSE 4000

# cwd explícito: Railway a veces ignora WORKDIR al ejecutar startCommand.
# Migraciones: Railway preDeployCommand o docker-compose command.
CMD ["sh", "-c", "cd /repo/apps/api && exec node dist/index.js"]
