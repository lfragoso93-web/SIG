# SIG — Sistema de Investimentos e Gestão

API REST para controle e acompanhamento de carteiras de investimentos. Permite cadastrar ativos (ações, FIIs, ETFs, BDRs, Tesouro Direto e renda fixa privada), registrar transações, importar histórico de preços e proventos automaticamente, calcular snapshots do portfólio e medir performance.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 + TypeScript |
| Framework | Express 4 |
| ORM | Prisma 6 |
| Banco de dados | PostgreSQL 16 |
| Agendamento | node-cron |
| Cotações B3 | BRAPI (ações, FIIs, ETFs, BDRs) |
| Cotações internacionais | Yahoo Finance |
| Cotações Tesouro Direto | radaropcoes.com |
| Taxas macro (CDI/SELIC/IPCA) | BRAPI |
| Containerização | Docker Compose |
| Autenticação | JWT (Bearer token) |
| Validação | Zod |

---

## Estrutura do Projeto

```
src/
├── index.ts                             # Entry point — Express, rotas e crons
├── core/
│   └── prisma/prisma.service.ts         # Instância singleton do PrismaClient
├── jobs/
│   ├── snapshot.cron.ts                 # Cron de snapshots DAILY/WEEKLY/MONTHLY
│   ├── price-import.cron.ts             # Cron de importação de preços (5x/dia, B3 + Yahoo)
│   ├── income-import.cron.ts            # Cron de importação de proventos (semanal)
│   ├── treasury-import.cron.ts          # Cron de preços do Tesouro Direto (seg-sex 19h BRT)
│   └── fixed-income-accrual.cron.ts     # Cron de accrual de renda fixa privada (seg-sex 18h45 BRT)
├── modules/
│   ├── auth/                            # Login e geração de JWT
│   ├── asset-classes/                   # Classes de ativos (Ação, FII, ETF, TREASURY…)
│   ├── assets/                          # Cadastro de ativos (B3, internacionais)
│   ├── transactions/                    # Compras, vendas e demais movimentos
│   ├── price-history/                   # Histórico OHLCV + importação via BRAPI
│   ├── income-events/                   # Proventos (dividendos, JCP, rendimentos FII)
│   ├── portfolio-items/                 # Posição consolidada por ativo
│   ├── portfolio-snapshots/             # Snapshots DAILY / WEEKLY / MONTHLY
│   ├── allocation/                      # Distribuição da carteira por classe
│   ├── performance/                     # Rentabilidade da carteira
│   ├── dividends/                       # Resumo de proventos recebidos
│   ├── treasury/                        # Tesouro Direto — CRUD, P&L, IR, IOF e resgate
│   │   ├── treasury.schema.ts           # DTOs (Zod)
│   │   ├── treasury.service.ts          # Regras de negócio + cálculos financeiros
│   │   ├── treasury.controller.ts       # Handlers HTTP
│   │   └── treasury.routes.ts           # Definição de rotas
│   └── fixed-income/                    # Renda Fixa Privada — CRUD, accrual, IR/IOF/isenção
│       ├── fixed-income.schema.ts       # DTOs (Zod)
│       ├── fixed-income.service.ts      # Accrual, IR regressivo, IOF, isenção LCI/LCA/CRI/CRA
│       ├── fixed-income.controller.ts   # Handlers HTTP
│       └── fixed-income.routes.ts       # Definição de rotas
├── providers/
│   ├── brapi/
│   │   ├── brapi.client.ts              # BRAPI + Yahoo Finance (cotação, histórico, dividendos)
│   │   ├── brapi-rates.provider.ts      # Taxas macro diárias: CDI, SELIC, IPCA (cache 1h)
│   │   └── brapi.types.ts               # Tipos auxiliares
│   └── radaropcoes/
│       └── radaropcoes.client.ts        # Cotações do Tesouro Direto (sem autenticação)
└── shared/
    ├── constants/                       # Constantes globais
    ├── errors/                          # Classes de erro customizadas
    ├── middleware/                      # authenticate, errorHandler
    └── utils/                           # Utilitários compartilhados
prisma/
├── schema.prisma                        # Schema completo do banco de dados
└── migrations/                          # Migrações geradas pelo Prisma
```

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```env
# Banco de dados
DATABASE_URL="postgresql://user:password@localhost:5432/sig"

# JWT
JWT_SECRET="sua-chave-secreta"
JWT_EXPIRES_IN="7d"

# BRAPI (cotações B3 + taxas macro CDI/SELIC/IPCA)
BRAPI_TOKEN="seu-token-brapi"
BRAPI_BASE_URL="https://brapi.dev/api"   # opcional — padrão já configurado

# Servidor
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

> ⚠️ A radaropcoes.com não exige token — é pública e gratuita.  
> ⚠️ Sem `CORS_ORIGIN` definido, a API aceita qualquer origem (`*`). Sempre defina em produção.

---

## Instalação e Execução

### Com Docker (recomendado)

```bash
# Subir banco + API
docker compose up -d

# Aplicar migrações
docker compose exec api npx prisma migrate deploy

# Acompanhar logs
docker compose logs -f api

# Rebuild após mudanças de código
docker compose build --no-cache api && docker compose up -d api
```

### Local (sem Docker)

```bash
npm install
npx prisma migrate deploy
npm run dev
```

---

## Endpoints

Todos os endpoints (exceto `/auth/*` e `/health`) exigem header:
```
Authorization: Bearer <token>
```

### Auth
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/register` | Criar conta |
| `POST` | `/auth/login` | Login — retorna JWT |

### Ativos
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/assets` | Listar ativos |
| `POST` | `/assets` | Criar ativo |
| `GET` | `/assets/:id` | Detalhe do ativo |
| `PUT` | `/assets/:id` | Atualizar ativo |
| `DELETE` | `/assets/:id` | Remover ativo |

### Classes de Ativos
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/asset-classes` | Listar classes |
| `POST` | `/asset-classes` | Criar classe |
| `PUT` | `/asset-classes/:id` | Atualizar classe |
| `DELETE` | `/asset-classes/:id` | Remover classe |

**Códigos de classe esperados no banco:**

| Código | Descrição |
|---|---|
| `DOMESTIC_STOCK` | Ação nacional (B3) |
| `STOCK` | Ação internacional |
| `ETF` | ETF nacional |
| `INTERNATIONAL_ETF` | ETF internacional |
| `FII` | Fundo Imobiliário |
| `BDR` | Brazilian Depositary Receipt |
| `CRYPTO` | Criptoativo |
| `FIXED_INCOME` | Renda fixa privada/bancária |
| `TREASURY` | Tesouro Direto |
| `CASH` | Caixa / saldo parado |

### Transações
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/transactions` | Listar transações |
| `POST` | `/transactions` | Registrar transação |
| `GET` | `/transactions/:id` | Detalhe |
| `PUT` | `/transactions/:id` | Atualizar |
| `DELETE` | `/transactions/:id` | Remover |

**Tipos de transação (`type`):** `BUY` | `SELL` | `DEPOSIT` | `WITHDRAW` | `FEE` | `TAX` | `TRANSFER_IN` | `TRANSFER_OUT` | `SPLIT` | `REVERSE_SPLIT` | `BONUS` | `AMORTIZATION` | `OTHER`

### Histórico de Preços
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/price-history` | Listar registros |
| `GET` | `/price-history/:assetId` | Por ativo |
| `POST` | `/price-history/import/:ticker` | Importar histórico via BRAPI (ações/FIIs/ETFs) |
| `POST` | `/price-history/import/treasury/:bondName` | Importar PU do dia via radaropcoes (Tesouro Direto) |

**Body da importação (por range):**
```json
{
  "interval": "1d",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

**Body da importação (por período relativo):**
```json
{
  "interval": "1d",
  "range": "1y"
}
```

`interval`: `1d` | `1wk` | `1mo`  
`range`: `1d` | `5d` | `1mo` | `3mo` | `6mo` | `1y` | `2y` | `5y` | `10y` | `ytd` | `max`

### Eventos de Renda (Proventos)
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/income-events` | Listar proventos |
| `POST` | `/income-events` | Registrar provento manual |
| `PUT` | `/income-events/:id` | Atualizar |
| `DELETE` | `/income-events/:id` | Remover |
| `POST` | `/income-events/import/:ticker` | Importar proventos de um ativo |
| `POST` | `/income-events/import/batch` | Importar proventos de todos os ativos ativos |

**Tipos de provento (`type`):** `DIVIDEND` | `JCP` | `FII_INCOME` | `COUPON` | `INTEREST` | `AMORTIZATION` | `SUBSCRIPTION_RIGHT` | `OTHER`

### Itens do Portfólio
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/portfolio-items` | Posição consolidada de todos os ativos |
| `GET` | `/portfolio-items/:assetId` | Posição de um ativo específico |

### Snapshots do Portfólio
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/portfolio-snapshots` | Listar snapshots |
| `GET` | `/portfolio-snapshots/:id` | Detalhe de um snapshot |
| `POST` | `/portfolio-snapshots/generate` | Gerar snapshot manual (data atual) |
| `POST` | `/portfolio-snapshots/generate-range` | Gerar snapshots em range de datas |

**Body do `generate-range`:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-05-26",
  "period": "DAILY"
}
```
`period`: `DAILY` | `WEEKLY` | `MONTHLY`

> ℹ️ Snapshots são gerados com base nos preços históricos existentes em `PriceHistory`. Rode a importação de preços antes de gerar snapshots para um range histórico.

### Alocação
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/allocation` | Distribuição atual da carteira por classe de ativo com comparação vs. meta |

### Performance
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/performance` | Rentabilidade da carteira |

### Dividendos
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/dividends` | Resumo de proventos recebidos por período |

### Tesouro Direto
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/treasury/available` | Lista todos os títulos disponíveis via radaropcoes.com |
| `GET` | `/treasury` | Lista posições da carteira com P&L, IR e IOF calculados |
| `GET` | `/treasury/:assetId` | Detalhe de uma posição específica |
| `POST` | `/treasury` | Registra compra de um título |
| `POST` | `/treasury/:assetId/redeem` | Registra resgate parcial ou total |
| `PATCH` | `/treasury/:assetId` | Atualiza metadados (indexer, vencimento, isActive) |

**Body do `POST /treasury`:**
```json
{
  "bondName": "Tesouro Selic 2029",
  "accountId": "cuid-da-conta",
  "indexer": "SELIC",
  "purchaseRate": 0.08,
  "purchaseDate": "2025-03-10",
  "maturityDate": "2029-03-01",
  "quantity": 0.13,
  "purchaseUnitValue": 14523.45
}
```

`indexer`: `SELIC` | `IPCA` | `PREFIXADO`  
`bondName`: use exatamente o nome retornado por `GET /treasury/available`  
`quantity`: frações permitidas (mínimo 0,01 unidade)

**Body do `POST /treasury/:assetId/redeem`:**
```json
{
  "quantity": 0.02,
  "redeemDate": "2026-05-26",
  "redeemUnitPrice": 19010.70
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `quantity` | number | ✅ | Cotas a resgatar (> 0 e ≤ posição atual) |
| `redeemDate` | string (ISO) | ❌ | Data do resgate (default: hoje) |
| `redeemUnitPrice` | number | ❌ | PU de resgate (default: último `closePrice` do `PriceHistory`) |

**Resposta do `POST /treasury/:assetId/redeem`:**
```json
{
  "assetId": "...",
  "bondName": "Tesouro Selic 2029",
  "quantityRedeemed": 0.02,
  "quantityRemaining": 0.11,
  "redeemUnitPrice": 19010.70,
  "grossProceeds": 380.21,
  "costBasis": 370.07,
  "grossPnL": 10.14,
  "irRate": 0.225,
  "iofRate": 0,
  "irAmount": 2.28,
  "iofAmount": 0,
  "netPnL": 7.86,
  "netProceeds": 387.93,
  "positionClosed": false,
  "transactionId": "cuid-gerado"
}
```

> ℹ️ `costBasis` = `avgCost × quantityRedeemed` (custo WAVG proporcional à quantidade resgatada).  
> ℹ️ IR/IOF são calculados pelo prazo da transação `BUY` mais antiga (FIFO fiscal).  
> ℹ️ Quando `quantityRemaining = 0`, a posição é arquivada automaticamente (`isActive = false`).

**Resposta do `GET /treasury` (por posição):**
```json
{
  "assetId": "...",
  "bondName": "Tesouro Selic 2029",
  "indexer": "SELIC",
  "maturityDate": "2029-03-01",
  "quantity": 0.13,
  "investedAmount": 1887.05,
  "redeemUnitPrice": 15210.33,
  "marketValue": 1977.34,
  "grossPnL": 90.29,
  "irRate": 0.15,
  "iofRate": 0,
  "irAmount": 13.54,
  "iofAmount": 0,
  "netPnL": 76.75,
  "netValue": 1963.80,
  "lastPriceDate": "2026-05-26"
}
```

### Renda Fixa Privada
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/fixed-income` | Lista posições com valor bruto, IR, IOF e valor líquido |
| `GET` | `/fixed-income/:assetId` | Detalhe de uma posição específica |
| `POST` | `/fixed-income` | Registra aplicação em CDB / LCI / LCA / CRI / CRA / Debênture |
| `POST` | `/fixed-income/:assetId/redeem` | Registra resgate parcial ou total |
| `PATCH` | `/fixed-income/:assetId` | Atualiza metadados (indexer, taxa, vencimento) |

**Body do `POST /fixed-income`:**
```json
{
  "ticker": "CDB-BANCO-XP-2028",
  "issuer": "Banco XP S.A.",
  "assetSubtype": "CDB",
  "accountId": "cuid-da-conta",
  "indexer": "CDI",
  "purchaseRate": 0.13,
  "purchaseDate": "2025-06-01",
  "maturityDate": "2028-06-01",
  "principal": 10000.00
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `ticker` | string | ✅ | Identificador único do papel |
| `issuer` | string | ✅ | Emissor (banco/empresa) |
| `assetSubtype` | string | ✅ | `CDB` \| `LCI` \| `LCA` \| `LIG` \| `CRI` \| `CRA` \| `DEBENTURE` \| `OTHER` |
| `accountId` | string | ✅ | Conta onde a aplicação está custodiada |
| `indexer` | string | ✅ | `CDI` \| `SELIC` \| `IPCA` \| `IGPM` \| `PREFIXADO` |
| `purchaseRate` | number | ✅ | Taxa contratada (ex: `1.13` = 113% CDI; `0.06` = IPCA+6% a.a.) |
| `purchaseDate` | string (ISO) | ✅ | Data da aplicação |
| `maturityDate` | string (ISO) | ✅ | Data de vencimento |
| `principal` | number | ✅ | Valor aplicado em R$ |

**Resposta do `GET /fixed-income` (por posição):**
```json
{
  "assetId": "...",
  "ticker": "CDB-BANCO-XP-2028",
  "issuer": "Banco XP S.A.",
  "assetSubtype": "CDB",
  "indexer": "CDI",
  "purchaseRate": 1.13,
  "purchaseDate": "2025-06-01",
  "maturityDate": "2028-06-01",
  "principal": 10000.00,
  "grossValue": 11380.45,
  "grossPnL": 1380.45,
  "irRate": 0.175,
  "iofRate": 0,
  "irAmount": 241.58,
  "iofAmount": 0,
  "netPnL": 1138.87,
  "netValue": 11138.87,
  "daysElapsed": 360,
  "isExempt": false,
  "lastUpdatedAt": "2026-05-26"
}
```

> ℹ️ `isExempt = true` para LCI, LCA, LIG, CRI, CRA e Debêntures incentivadas (PF) — IR = 0.  
> ℹ️ `grossValue` é calculado por accrual (juros compostos) usando taxas reais da BRAPI (CDI/SELIC/IPCA).

### Health
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status da API e uptime |

---

## Jobs Automáticos (Crons)

### Ordem de execução diária (seg–sex)

| Horário BRT | Job | Descrição |
|---|---|---|
| 10:00–17:30 | `price-import` | Cotações B3 + Yahoo (5 execuções) |
| 18:00 (sex) | `snapshot` | Snapshot semanal |
| 18:30 | `snapshot` | Snapshot diário |
| **18:45** | **`fixed-income-accrual`** | **Accrual de renda fixa privada** |
| 19:00 | `treasury-import` | PU do Tesouro Direto |
| Dom 06:00 | `income-import` | Proventos Yahoo Finance |

---

### Importação de Preços B3 — `price-import.cron.ts`

Roda **5x por dia, segunda a sexta**, em horário de pregão B3:

| Horário BRT | Horário UTC | Expressão cron |
|---|---|---|
| 10:00 | 13:00 | `0 13 * * 1-5` |
| 11:30 | 14:30 | `30 14 * * 1-5` |
| 13:00 | 16:00 | `0 16 * * 1-5` |
| 15:00 | 18:00 | `0 18 * * 1-5` |
| 17:30 | 20:30 | `30 20 * * 1-5` |

- **Ativos BRL** → BRAPI (batch de até 50 tickers, com fallback individual)
- **Ativos não-BRL** → Yahoo Finance (individual)
- Faz `upsert` em `PriceHistory` para a data do dia

**Executar manualmente:**
```bash
docker compose exec api node -e "
const { importCurrentPrices } = require('./dist/jobs/price-import.cron');
importCurrentPrices().then(r => console.log(JSON.stringify(r, null, 2)));
"
```

---

### Importação de Proventos — `income-import.cron.ts`

Roda **1x por semana**, domingo às 06:00 BRT (09:00 UTC):

| Horário BRT | Horário UTC | Expressão cron |
|---|---|---|
| Dom 06:00 | Dom 09:00 | `0 9 * * 0` |

- Importa dividendos, JCP e rendimentos de todos os ativos ativos via Yahoo Finance
- Usa `skipDuplicates` — seguro para execução manual a qualquer momento sem duplicar registros

**Executar manualmente:**
```bash
docker compose exec api node -e "
const { importAllIncomeEvents } = require('./dist/jobs/income-import.cron');
importAllIncomeEvents().then(r => console.log(JSON.stringify(r, null, 2)));
"
```

---

### Snapshots do Portfólio — `snapshot.cron.ts`

| Frequência | Horário BRT | Expressão cron | Período gerado |
|---|---|---|---|
| Diário | 18:30 (seg–sex) | `30 21 * * 1-5` | `DAILY` |
| Semanal | Sex 18:00 | `0 21 * * 5` | `WEEKLY` |
| Mensal | Último dia 23:59 | `59 23 28-31 * *` | `MONTHLY` |

> ℹ️ Para gerar snapshots históricos retroativos, use o endpoint `POST /portfolio-snapshots/generate-range`.

**Executar manualmente:**
```bash
$headers = @{ Authorization = "Bearer SEU_TOKEN" }
Invoke-RestMethod -Uri "http://localhost:3000/portfolio-snapshots/generate-range" `
  -Method Post -Headers $headers -ContentType "application/json" `
  -Body '{"startDate":"2026-01-01","endDate":"2026-05-26","period":"DAILY"}'
```

---

### Importação de Preços — Tesouro Direto — `treasury-import.cron.ts`

Roda **1x por dia, segunda a sexta**, após fechamento do mercado:

| Horário BRT | Horário UTC | Expressão cron |
|---|---|---|
| Seg–Sex 19:00 | 22:00 | `0 22 * * 1-5` |

- Consulta `radaropcoes.com/bonds/{name}` para cada título ativo cadastrado como `BOND` na classe `TREASURY`
- Salva em `PriceHistory`:
  - `closePrice` ← `unitaryRedemptionValue` (PU Resgate — usado para calcular P&L)
  - `openPrice` ← `unitaryInvestmentValue` (PU Compra do dia)
  - `source` = `'radaropcoes'`
- Atualiza `marketPrice` no `PortfolioItem` correspondente
- Verifica existência antes de inserir — seguro para múltiplas execuções no mesmo dia

**Executar manualmente:**
```bash
docker compose exec api node -e "
const { importTreasuryPrices } = require('./dist/jobs/treasury-import.cron');
importTreasuryPrices().then(r => console.log(JSON.stringify(r, null, 2)));
"
```

---

### Accrual de Renda Fixa Privada — `fixed-income-accrual.cron.ts`

Roda **1x por dia, segunda a sexta**, após o snapshot diário:

| Horário BRT | Horário UTC | Expressão cron |
|---|---|---|
| Seg–Sex 18:45 | 21:45 | `45 21 * * 1-5` |

- Busca todas as posições `FIXED_INCOME` ativas de uma vez
- Chama `getMacroRates()` **uma única vez** por execução — taxas CDI/SELIC/IPCA do dia (cache 1h)
- Para cada posição, calcula `grossValue` por accrual (juros compostos) e persiste `marketValue`, `unrealizedPnL` e `lastUpdatedAt`
- Fórmulas por indexador:
  - **CDI / SELIC** → `principal × (1 + baseRate × purchaseRate)^(diasCorridos/252)`
  - **IPCA / IGPM** → `principal × (1 + ipca + purchaseRate)^(diasCorridos/365)`
  - **PREFIXADO** → `principal × (1 + purchaseRate)^(diasCorridos/365)`

**Executar manualmente:**
```bash
docker compose exec api node -e "
const { runFixedIncomeAccrual } = require('./dist/jobs/fixed-income-accrual.cron');
runFixedIncomeAccrual().then(r => console.log(JSON.stringify(r, null, 2)));
"
```

---

## Provedores de Dados

### BRAPI + Yahoo Finance — `brapi.client.ts`

Usado para ações, FIIs, ETFs, BDRs e ativos internacionais.

| Método | Fonte | Descrição |
|---|---|---|
| `getHistoricalPrices(params)` | BRAPI | Histórico OHLCV de um ticker |
| `getCurrentPrices(tickers[])` | BRAPI | Cotação atual em batch (fallback individual) |
| `getYahooCurrentPrice(ticker)` | Yahoo Finance | Cotação atual de ativo internacional |
| `getDividends(ticker)` | Yahoo Finance | Dividendos históricos |

### BRAPI Rates — `brapi-rates.provider.ts`

Usado pelo cron de accrual de renda fixa para obter taxas macro diárias.

| Método | Descrição |
|---|---|
| `getMacroRates()` | Retorna `{ cdi, selic, ipca }` em formato decimal anual (cache 1h) |

---

### radaropcoes.com — `radaropcoes.client.ts`

Usado exclusivamente para títulos do Tesouro Direto. **Sem autenticação.**

| Método | Endpoint | Descrição |
|---|---|---|
| `getBond(bondName)` | `GET /bonds/{name}` | Cotação atual de um título (PU Resgate + PU Compra + taxa) |
| `listBonds()` | `GET /bonds.json` | Lista todos os títulos disponíveis no Tesouro Direto |

**Campos retornados por `getBond`:**

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome canônico do título |
| `indexer` | string | `"Selic"` \| `"IPCA"` \| `"Prefixado"` |
| `rate` | number | Taxa vigente (% a.a.) |
| `maturityDate` | string | Data de vencimento (ISO-8601) |
| `unitaryRedemptionValue` | number | PU Resgate — valor bruto de resgate por unidade |
| `unitaryInvestmentValue` | number | PU Compra — valor necessário para comprar 1 unidade |

---

## Lógica de Cálculo — Tesouro Direto

O serviço `treasury.service.ts` aplica automaticamente as regras fiscais vigentes:

### IR Regressivo

| Prazo desde a compra | Alíquota IR |
|---|---|
| Até 180 dias | 22,5% |
| 181 a 360 dias | 20,0% |
| 361 a 720 dias | 17,5% |
| Acima de 720 dias | 15,0% |

### IOF Regressivo (primeiros 30 dias)

O IOF incide apenas sobre o lucro e é cobrado nos primeiros 30 dias, com alíquota regressiva diária (96% no dia 1 → 0% a partir do dia 30).

### Custo Médio Ponderado (WAVG)

O `investedAmount` é calculado percorrendo todas as transações `BUY` e `SELL` em ordem cronológica:

- **BUY**: atualiza o preço médio ponderado e aumenta a quantidade acumulada
- **SELL**: reduz a quantidade sem alterar o preço médio
- **investedAmount** = `avgCost × qtdAtual`

Isso garante que resgates parciais anteriores não distorçam o custo da posição remanescente.

### Fórmula P&L (posição aberta)

```
Valor de Mercado  = quantity × unitaryRedemptionValue
Custo (WAVG)      = avgCost × quantity
Lucro Bruto       = Valor de Mercado − Custo
IOF               = Lucro Bruto × iofRate  (apenas se < 30 dias)
Base IR           = Lucro Bruto × (1 − iofRate)
IR                = Base IR × irRate
Lucro Líquido     = Lucro Bruto − IOF − IR
Valor Líquido     = Custo + Lucro Líquido
```

### Fórmula P&L (resgate)

```
Gross Proceeds    = quantityRedeemed × redeemUnitPrice
Cost Basis        = avgCost × quantityRedeemed
Gross PnL         = Gross Proceeds − Cost Basis
IOF               = Gross PnL × iofRate  (prazo da compra mais antiga — FIFO fiscal)
IR                = (Gross PnL − IOF) × irRate
Net PnL           = Gross PnL − IOF − IR
Net Proceeds      = Cost Basis + Net PnL
```

> ℹ️ IR e IOF incidem apenas sobre rendimento positivo. Posições com `grossPnL < 0` retornam `irAmount = 0` e `iofAmount = 0`.

---

## Lógica de Cálculo — Renda Fixa Privada

O serviço `fixed-income.service.ts` aplica accrual diário e regras fiscais por subtipo:

### Accrual por Indexador

| Indexer | Fórmula |
|---|---|
| `CDI` / `SELIC` | `principal × (1 + baseRate × purchaseRate)^(dias/252)` |
| `IPCA` / `IGPM` | `principal × (1 + ipca + purchaseRate)^(dias/365)` |
| `PREFIXADO` | `principal × (1 + purchaseRate)^(dias/365)` |

### Tributação por Subtipo

| Subtipo | IR | IOF | Observação |
|---|---|---|---|
| `CDB` | Regressivo (22,5% → 15%) | Sim (30 dias) | Mesma tabela do Tesouro Direto |
| `LCI` / `LCA` / `LIG` | **Isento (PF)** | Não | Isenção garantida por lei |
| `CRI` / `CRA` | **Isento (PF)** | Não | Isenção garantida por lei |
| `DEBENTURE` incentivada | **Isento (PF)** | Não | Lei 12.431/2011 |
| `DEBENTURE` comum | Regressivo | Sim (30 dias) | Mesma tabela do CDB |
| `OTHER` | Regressivo | Sim (30 dias) | Conservador — aplica tabela padrão |

---

## Banco de Dados

### Comandos essenciais

```bash
# Gerar nova migração após alterar schema.prisma
npx prisma migrate dev --name descricao-da-mudanca

# Aplicar migrações em produção / Docker
npx prisma migrate deploy

# Abrir Prisma Studio (interface visual do banco)
npx prisma studio

# Regenerar o Prisma Client após mudança no schema
npx prisma generate
```

### Models principais

| Model | Descrição |
|---|---|
| `AssetClass` | Classificação macro (DOMESTIC_STOCK, FII, TREASURY, FIXED_INCOME…) |
| `Asset` | Ativo individual — ticker, nome, classe, indexer, maturityDate, issuer |
| `Transaction` | Compra, venda e demais movimentos financeiros |
| `PriceHistory` | OHLCV diário por ativo (B3, Yahoo e Tesouro Direto) |
| `IncomeEvent` | Proventos recebidos (dividendo, JCP, rendimento FII) |
| `PortfolioItem` | Posição consolidada — quantidade, preço médio, market value, unrealizedPnL |
| `PortfolioSnapshot` | Fotografia do portfólio em uma data (DAILY/WEEKLY/MONTHLY) |
| `PortfolioAssetSnapshot` | Detalhe por ativo dentro do snapshot |
| `PortfolioClassSnapshot` | Detalhe por classe dentro do snapshot |
| `AllocationTarget` | Meta de alocação por classe e período |
| `Institution` | Corretoras e bancos |
| `Account` | Contas dentro de uma instituição |

> ℹ️ Tesouro Direto e Renda Fixa Privada usam os mesmos models `Asset` e `PriceHistory` — sem tabelas exclusivas.  
> ℹ️ Renda Fixa usa `asset.indexer`, `asset.issuer` e `transaction.unitPrice` (como `purchaseRate`) para calcular accrual.

---

## Roadmap

### ✅ Concluído
- [x] CRUD completo de ativos, classes de ativos, transações, proventos e contas
- [x] Importação de histórico de preços via BRAPI (por range de datas ou período relativo)
- [x] Snapshots DAILY / WEEKLY / MONTHLY com geração em range retroativo
- [x] Cron de importação de preços B3 + Yahoo Finance (5x/dia, seg–sex)
- [x] Cron de importação de proventos semanal (Yahoo Finance, skipDuplicates)
- [x] Endpoints de alocação, performance e dividendos
- [x] **Módulo Tesouro Direto completo** — cadastro, P&L com WAVG, IR regressivo, IOF, cron diário (radaropcoes.com), resgate parcial/total com cálculo fiscal e arquivamento de posição
- [x] **Módulo Renda Fixa Privada completo** — CDB / LCI / LCA / LIG / CRI / CRA / Debêntures, accrual por indexador (CDI/SELIC/IPCA/IGPM/PREFIXADO), IR/IOF regressivo, isenção automática por subtipo, resgate com P&L realizado
- [x] **Cron de accrual de Renda Fixa** — atualização diária de `marketValue` e `unrealizedPnL` com taxas reais (BRAPI), seg–sex 18:45 BRT

### 🔴 Alta Prioridade
- [ ] **Frontend — dashboard principal**
  - Gráfico de evolução do patrimônio consumindo snapshots `DAILY`
  - Cards de KPIs: patrimônio atual, rentabilidade, proventos recebidos, rendimento líquido
  - Tabela de posição por ativo com P&L, IR estimado e % da carteira
  - Gráfico de alocação por classe vs. meta
  - Seção de Tesouro Direto com tabela de títulos e P&L líquido
  - Seção de Renda Fixa Privada com accrual atualizado e status de isenção
- [ ] **Tesouro Direto — import histórico via CSV do Tesouro Transparente**
  - Carga retroativa de `PriceHistory` desde a data de compra
  - Fonte: `tesourotransparente.gov.br` (CSV diário público, sem autenticação)

### 🟡 Média Prioridade
- [ ] **IRR / XIRR** — retorno real da carteira considerando timing e valor de cada aporte
- [ ] **Benchmark** — comparar rentabilidade vs. CDI, IBOV e IPCA (série histórica diária)
- [ ] **Importação via corretora** — leitura de notas de corretagem (PDF/XLSX) para cadastro automático de transações
- [ ] **Alertas de preço** — notificação quando ativo atingir preço-alvo (e-mail ou webhook)
- [ ] **Testes automatizados** — cobertura mínima nos services críticos (snapshots, portfolio-items, treasury, fixed-income, price-import)
- [ ] **Tesouro Direto — BRAPI Pro** — migrar provider de radaropcoes para BRAPI `/api/v2/treasury` se plano Pro for contratado

### 🟢 Baixa Prioridade
- [ ] **Multi-carteira** — suporte a múltiplas carteiras por usuário (pessoal, PGBL, previdência, carteira do cônjuge)
- [ ] **Proventos previstos** — calendário de dividendos futuros com base em histórico e anúncios
- [ ] **Rate limiting** — proteção por IP nos endpoints públicos
- [ ] **Logs estruturados** — substituir `console.log` por Winston/Pino com níveis de log e saída JSON
- [ ] **CI/CD** — pipeline GitHub Actions: lint + build + testes a cada PR

---

## Contribuindo

```bash
# Criar branch de feature
git checkout -b feat/nome-da-feature

# Commitar seguindo Conventional Commits
git commit -m "feat(module): descrição da mudança"

# Push e abrir PR para main
git push origin feat/nome-da-feature
```
