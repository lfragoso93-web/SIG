# ── Estágio 1: dependências ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
# Instala apenas dependências de produção + dev necessárias para o build
RUN npm ci

# ── Estágio 2: build TypeScript ───────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Estágio 3: imagem final (sem devDependencies) ─────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma/schema.prisma              ./prisma/schema.prisma

EXPOSE 3001

# Roda migrations pendentes e sobe o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
