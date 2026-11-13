# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY shared ./shared
RUN npx nest build

# ---------- runtime ----------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# dist layout is flat in this container (no tests/ dir => no src/ nesting)
ENV MIGRATIONS_DIR=/app/drizzle
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY backend/drizzle ./drizzle
EXPOSE 3000
# Run migrations on startup; seed is commented out for production (run manually when needed):
# && node dist/${n:+src/}db/seed.js
CMD ["sh", "-c", "test -f dist/src/main.js && n=src || n=; node dist/${n:+src/}run-migrate.js && node dist/${n:+src/}main.js"]
