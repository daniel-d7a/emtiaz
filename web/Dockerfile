# build from repo root: docker build -f web/Dockerfile .
# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/vite.config.ts frontend/index.html frontend/tsconfig.json ./
COPY frontend/src ./src
RUN npx vite build

# ---------- runtime ----------
FROM caddy:2-alpine
COPY --from=build /fe/dist /srv/www
COPY landing /srv/www/landing
COPY web/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
