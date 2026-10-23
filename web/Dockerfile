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
FROM nginx:1.27-alpine
COPY --from=build /fe/dist /usr/share/nginx/html
COPY landing /usr/share/nginx/html/landing
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
