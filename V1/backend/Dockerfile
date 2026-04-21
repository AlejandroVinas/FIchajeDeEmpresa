# ── Etapa de construcción ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Imagen final ───────────────────────────────────────────────────────────
FROM node:20-alpine

# better-sqlite3 necesita python3 + make para compilar en alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Directorio persistente para la base de datos
VOLUME ["/app/data"]

ENV DB_PATH=/app/data/fichajes.db

EXPOSE 3000
CMD ["node", "server.js"]
