# ── Estágio 1: dependências ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# OpenSSL necessário para o Prisma Client
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

# ── Estágio 2: build TypeScript ───────────────────────────────────────────────
FROM deps AS builder
COPY . .

# prisma generate só gera o client TypeScript — não precisa de banco real.
# A DATABASE_URL é exigida pelo prisma.config.ts (que usa dotenv),
# por isso passamos um valor ficticio apenas para este step.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate
RUN npm run build

# ── Estágio 3: imagem final (sem devDependencies) ─────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# OpenSSL necessário para o Prisma Client em runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist              ./dist
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
COPY prisma/schema.prisma                  ./prisma/schema.prisma
COPY prisma.config.ts                      ./prisma.config.ts

EXPOSE 3001

# Roda migrations pendentes e sobe o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
