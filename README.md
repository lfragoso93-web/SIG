# SIG — Sistema de Investimentos

Backend de gestão de carteira de investimentos, desenvolvido em Node.js com TypeScript, Express, Prisma ORM e PostgreSQL. Integra dados de mercado via [brapi.dev](https://brapi.dev) para importação de histórico de preços e proventos de ativos da B3.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 |
| Linguagem | TypeScript 5 |
| Framework HTTP | Express 5 |
| ORM | Prisma 7 + adapter `pg` |
| Banco de dados | PostgreSQL 18 |
| Validação | Zod 3 |
| HTTP Client | Axios 1 |
| Infraestrutura | Docker Compose |

---

## Status dos módulos

| Módulo | Endpoints | Status |
|---|---|---|
| `asset-classes` | CRUD completo | ✅ Validado |
| `assets` | CRUD completo | ✅ Validado |
| `transactions` | CRUD completo | ✅ Validado |
| `income-events` | CRUD + import por ticker + import em lote | ✅ Validado |
| `price-history` | Import por ticker + import em lote | ✅ Validado |
| `portfolio-items` | Recalculo por ticker + recalculo total | ✅ Validado |
| `portfolio-snapshots` | Fotografia periódica | 🔲 Pendente |

---

## Estrutura do projeto

```
src/
├── core/
│   └── prisma/
│       └── prisma.service.ts          # Singleton do PrismaClient com adapter pg
├── modules/
│   ├── asset-classes/                 # Classificação macro dos ativos
│   ├── assets/                        # Cadastro de ativos (ticker, tipo, classe)
│   ├── transactions/                  # Compras, vendas, aportes e resgates
│   ├── income-events/                 # Proventos: dividendos, JCP, FII income
│   │   ├── income-events.schema.ts
│   │   ├── income-events.service.ts
│   │   ├── income-events.controller.ts
│   │   └── income-events.routes.ts
│   ├── price-history/                 # Histórico de preços importado via brapi
│   │   ├── price-history.schema.ts
│   │   ├── price-history.service.ts
│   │   ├── price-history.controller.ts
│   │   └── price-history.routes.ts
│   └── portfolio-items/               # Posição atual consolidada por ativo
│       ├── portfolio-items.service.ts
│       └── portfolio-items.controller.ts
├── providers/
│   └── brapi/
│       └── brapi.client.ts            # Cliente HTTP para a API brapi.dev
└── index.ts                           # Entry point — Express app
prisma/
└── schema.prisma                      # Modelos Prisma
```

---

## Modelos de dados principais

| Modelo | Descrição |
|---|---|
| `AssetClass` | Classificação macro: `DOMESTIC_STOCK`, `ETF`, `FII`, `BDR`, `CRYPTO`, `FIXED_INCOME`, `TREASURY`, `CASH` |
| `Asset` | Ativo individual com ticker, tipo (`AssetType`), classe e moeda |
| `Transaction` | Operações: `BUY`, `SELL`, `DEPOSIT`, `WITHDRAW`, `SPLIT`, etc. |
| `IncomeEvent` | Proventos: `DIVIDEND`, `JCP`, `FII_INCOME`, `COUPON`, etc. |
| `PriceHistory` | Histórico OHLC diário por ativo, com `@@unique([assetId, priceDate])` |
| `PortfolioItem` | Posição atual consolidada por ativo (accountId opcional) |
| `PortfolioSnapshot` | Fotografia periódica da carteira (diária, mensal, anual) |
| `AllocationTarget` | Metas de alocação por classe com vigência temporal |

---

## Configuração

### Pré-requisitos

- Docker Desktop com WSL2 habilitado
- Git

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de dados
POSTGRES_DB=sig
POSTGRES_PASSWORD=postgres
APP_DB_USER=app
APP_DB_PASSWORD=app123
DB_PORT=54320

# App
APP_PORT=3001
DATABASE_URL=postgresql://app:app123@db:5432/sig

# Docker
POSTGRES_VOLUME_NAME=sig_postgres_data
DOCKER_NETWORK_NAME=sig_network

# brapi.dev (opcional — necessário para planos pagos)
BRAPI_TOKEN=seu_token_aqui
```

> A porta `DB_PORT` usa `54320` para evitar conflito com ranges reservados pelo Hyper-V/WSL2 no Windows.

### Subindo o ambiente

```bash
# Primeira vez — criar rede e volume externos
docker network create sig_network
docker volume create sig_postgres_data

# Subir containers
docker compose up --build

# Aplicar migrations do Prisma (em outro terminal)
docker compose exec app npx prisma migrate deploy

# Popular dados de referência (seed)
docker compose exec app npm run seed
```

### Após alterar o schema Prisma

Sempre que o `schema.prisma` for alterado, regenere o client dentro do container antes de reiniciar:

```bash
docker compose exec app npx prisma generate
docker compose restart app
```

---

## Endpoints disponíveis

### Health

```
GET /health
```

### Asset Classes

```
GET    /asset-classes
POST   /asset-classes
GET    /asset-classes/:id
PATCH  /asset-classes/:id
DELETE /asset-classes/:id
```

### Assets

```
GET    /assets
POST   /assets
GET    /assets/:id
PATCH  /assets/:id
DELETE /assets/:id
```

### Transactions

```
GET    /transactions
POST   /transactions
GET    /transactions/:id
PATCH  /transactions/:id
DELETE /transactions/:id
```

O campo `accountId` é opcional — a gestão da carteira é orientada ao ativo, não à corretora.

### Income Events

```
GET    /income-events
POST   /income-events
GET    /income-events/:id
PATCH  /income-events/:id
DELETE /income-events/:id

POST   /income-events/import/:ticker
POST   /income-events/import-batch
```

**import/:ticker — Resposta:**
```json
{ "ticker": "PETR4", "inserted": 60, "skipped": 0, "total": 60 }
```

**import-batch — Body:**
```json
{ "tickers": ["PETR4", "VALE3", "HGLG11"] }
```
> Se `tickers` for omitido ou vazio, importa todos os ativos ativos do banco.

**import-batch — Resposta:**
```json
{
  "summary": { "total": 180, "inserted": 120, "skipped": 60, "errors": 0 },
  "results": [
    { "ticker": "PETR4", "inserted": 60, "skipped": 0, "total": 60 },
    { "ticker": "VALE3", "inserted": 45, "skipped": 15, "total": 60 }
  ]
}
```

### Price History

```
POST /price-history/import/:ticker
POST /price-history/import-batch
```

**import/:ticker — Body (range):**
```json
{ "range": "5y", "interval": "1d" }
```

**import/:ticker — Body (datas explícitas):**
```json
{ "startDate": "2024-01-01", "endDate": "2024-12-31", "interval": "1d" }
```

**import-batch — Body:**
```json
{ "tickers": ["PETR4", "VALE3"], "range": "5y", "interval": "1d" }
```
> Se `tickers` for omitido ou vazio, importa histórico de todos os ativos ativos.

**import-batch — Resposta:**
```json
{
  "summary": { "total": 2496, "inserted": 1996, "skipped": 500, "errors": 0 },
  "results": [
    { "ticker": "PETR4", "inserted": 998, "skipped": 250, "total": 1248 },
    { "ticker": "VALE3", "inserted": 998, "skipped": 250, "total": 1248 }
  ]
}
```

### Portfolio Items

```
GET  /portfolio-items
POST /portfolio-items/recalculate/:ticker
POST /portfolio-items/recalculate
```

**recalculate/:ticker — Resposta:**
```json
{
  "ticker": "PETR4",
  "accounts": 1,
  "items": [{
    "accountId": null,
    "quantity": 100,
    "averagePrice": 36.5,
    "investedAmount": 3650,
    "marketPrice": 44.6,
    "marketValue": 4460,
    "unrealizedPnL": 810,
    "realizedPnL": 0
  }]
}
```

---

## Integração brapi.dev

O cliente `BrapiClient` em `src/providers/brapi/brapi.client.ts` consome a [brapi.dev](https://brapi.dev/docs/acoes), suportando:

- `range`: janela temporal pré-definida (`1d`, `1mo`, `1y`, `5y`, `max`, etc.)
- `startDate` + `endDate`: intervalo personalizado no formato `YYYY-MM-DD`
- `interval`: granularidade dos candles (`1d`, `1wk`, `1mo`, etc.)
- `dividends=true`: proventos históricos por ticker

O token de autenticação é lido da variável `BRAPI_TOKEN`. Se não definido, a API é consumida no plano gratuito.

---

## Convenções de código

- **Padrão de módulo:** `schema.ts` (Zod) → `service.ts` → `controller.ts` → `routes.ts`
- **Exports nomeados** em todos os arquivos (`export const`)
- **Prisma singleton** via `globalThis` em `src/core/prisma/prisma.service.ts`
- **Validação na borda:** Zod valida todos os inputs antes de chegar ao service

---

## Decisões de domínio

### Classificação de ativos

`assetType` representa o tipo técnico do instrumento. A distinção entre nacional e internacional fica em `AssetClass.code` — por exemplo, ação nacional usa `DOMESTIC_STOCK` e ação internacional usa `STOCK`.

### Transactions orientadas ao ativo

O `accountId` em `Transaction` e `PortfolioItem` é opcional porque a gestão da carteira é orientada ao ativo, não à corretora. Isso permite registrar operações sem vínculo obrigatório com uma conta/custodiante.

### Import idempotente

Todos os endpoints de importação usam `skipDuplicates: true` no Prisma e `externalId` como chave de deduplicação, permitindo que o mesmo import seja reexecutado sem efeitos colaterais.

### Import em lote

Os endpoints `import-batch` de `price-history` e `income-events` processam os tickers **sequencialmente** (não em paralelo) para não sobrecarregar a API brapi.dev. Erros em um ticker são capturados individualmente e reportados no campo `error` do resultado, sem interromper o restante do lote.

---

## Próximos passos

- [ ] `portfolio-snapshots` — fotografia periódica da carteira
- [ ] Autenticação e controle de acesso
