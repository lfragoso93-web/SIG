# ── Estágio 1: dependências ────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# OpenSSL necessário para o Prisma Client
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# npm install resolve divergências entre package.json e package-lock.json
# sem falhar o build. O lock interno ao container é descartado após o estágio.
RUN npm install --prefer-offline

# ── Estágio 2: build TypeScript ──────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .

# prisma generate só gera o client TypeScript — não conecta ao banco.
# DATABASE_URL é obrigatório apenas para validação do schema.prisma.
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

# ── Estágio 3: imagem final (sem devDependencies) ──────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# OpenSSL necessário para o Prisma Client em runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev --prefer-offline

COPY --from=builder /app/dist                  ./dist
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
# schema + migrations necessários para o `prisma migrate deploy` no CMD
COPY --from=builder /app/prisma                ./prisma
COPY prisma.config.ts                          ./prisma.config.ts

EXPOSE 3001

# Roda migrations pendentes e sobe o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
