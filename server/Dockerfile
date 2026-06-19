# Image untuk backend API (Express + SQLite).
# Build context = root proyek (lihat docker-compose.yml).
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Build tools untuk kompilasi better-sqlite3 bila prebuilt tidak tersedia.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/app.db

# Volume penyimpanan SQLite; pastikan dapat ditulis oleh user non-root.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3001
CMD ["node", "server/index.js"]
