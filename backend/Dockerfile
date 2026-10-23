# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY tsconfig.json ./
COPY src ./src
RUN npx nest build

# ---------- runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# dist layout is flat in this container (no tests/ dir => no src/ nesting)
ENV MIGRATIONS_DIR=/app/drizzle
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
EXPOSE 3000
CMD ["sh", "-c", "test -f dist/src/main.js && n=src || n=; node dist/${n:+src/}run-migrate.js && node dist/${n:+src/}main.js"]
