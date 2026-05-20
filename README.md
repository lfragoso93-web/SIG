# SIG — Sistema de Investimentos

Backend de gestão de carteira de investimentos, desenvolvido em Node.js com TypeScript, Express, Prisma ORM e PostgreSQL. Integra dados de mercado via [brapi.dev](https://brapi.dev) para importação de histórico de preços de ativos da B3.

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

## Estrutura do projeto

```
src/
├── core/
│   └── prisma/
│       └── prisma.service.ts        # Singleton do PrismaClient com adapter pg
├── modules/
│   ├── asset-classes/               # Classificação macro dos ativos
│   ├── assets/                      # Cadastro de ativos (ticker, tipo, classe)
│   ├── transactions/                # Compras, vendas, aportes e resgates
│   └── price-history/               # Histórico de preços importado via brapi
│       ├── price-history.schema.ts  # Schemas Zod de validação
│       ├── price-history.service.ts # Lógica de importação e persistência
│       ├── price-history.controller.ts
│       └── price-history.routes.ts
├── providers/
│   └── brapi/
│       └── brapi.client.ts          # Cliente HTTP para a API brapi.dev
└── index.ts                         # Entry point — Express app
prisma/
└── schema.prisma                    # Modelos Prisma
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
| `PortfolioItem` | Posição atual consolidada por ativo e conta |
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
docker exec -it docker-app npx prisma migrate deploy

# Popular dados de referência (seed)
docker exec -it docker-app npm run seed
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

### Price History

```
POST /price-history/import/:ticker
```

**Body (range):**
```json
{
  "range": "1y",
  "interval": "1d"
}
```

**Body (datas explícitas):**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "interval": "1d"
}
```

**Resposta:**
```json
{
  "ticker": "PETR4",
  "inserted": 250,
  "skipped": 0,
  "total": 250
}
```

> A importação é idempotente — registros duplicados são ignorados via `skipDuplicates: true` respeitando a constraint `@@unique([assetId, priceDate])` do schema.

---

## Integração brapi.dev

O cliente `BrapiClient` em `src/providers/brapi/brapi.client.ts` consome o endpoint `/quote/:ticker` da [brapi.dev](https://brapi.dev/docs/acoes), suportando:

- `range`: janela temporal pré-definida (`1d`, `1mo`, `1y`, `max`, etc.)
- `startDate` + `endDate`: intervalo personalizado no formato `YYYY-MM-DD`
- `interval`: granularidade dos candles (`1d`, `1wk`, `1mo`, etc.)

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

O `accountId` em `Transaction` é opcional porque a gestão da carteira é orientada ao ativo, não à corretora. Isso permite registrar operações sem vínculo obrigatório com uma conta/custodiante.

---

## Próximos passos

- [ ] Importação de dividendos via brapi (`dividends=true`)
- [ ] Endpoint de importação em lote (múltiplos tickers)
- [ ] Módulo `income-events` com rotas CRUD
- [ ] Cálculo de posição atual (`PortfolioItem`) a partir de transações
- [ ] Geração de snapshots periódicos da carteira
- [ ] Autenticação e controle de acesso
