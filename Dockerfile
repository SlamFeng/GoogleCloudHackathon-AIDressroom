# Fashini — single Cloud Run service: Express API + Agent runtime + inventory,
# also serving the built Vite frontend as static assets.

# ---- build stage ----
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (not ci): the lockfile only records the host platform's optional
# rollup binary, so `npm ci` fails on linux/amd64 (npm/cli#4828).
RUN npm install --no-audit --no-fund
COPY . .
# tsc (app) + vite build (-> dist/) + tsc (server -> dist-server/)
RUN npm run build

# ---- runtime stage ----
FROM node:22-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
# sharp needs no extra libs on node:22-slim (prebuilt binaries), install prod deps only
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
# built artifacts + runtime-read schema files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/schemas ./schemas
# Cloud Run injects PORT (usually 8080); server reads process.env.PORT ?? 8787
EXPOSE 8080
CMD ["node", "dist-server/index.js"]
