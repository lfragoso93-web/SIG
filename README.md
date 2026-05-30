# SGFP — Sistema de Gestão de Finanças Pessoais

Plataforma pessoal de gestão financeira com foco em investimentos. Permite cadastrar ativos (ações, FIIs, ETFs, BDRs, Tesouro Direto e renda fixa privada), registrar transações, importar histórico de preços e proventos automaticamente, calcular snapshots do portfólio, medir performance, calcular IRPF e visualizar tudo em um frontend moderno. Suporta **múltiplos usuários** com carteiras isoladas.

> 📌 **Documentação viva** — este README reflete o estado real do projeto. Atualize sempre que implementar, corrigir ou planejar algo.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 + TypeScript |
| API Framework | Express + Zod |
| ORM | Prisma 6 |
| Banco de dados | PostgreSQL |
| Frontend | Next.js 15 (App Router) + Tailwind CSS v4 |
| Autenticação | JWT via cookie HttpOnly — same-origin via proxy Next.js |
| Validação (API) | Zod |
| Agendamento | node-cron |
| Cotações B3 | **BRAPI** (principal — ações, FIIs, ETFs, BDRs) |
| Cotações fallback | **Yahoo Finance** (secundário — consultado se Brapi não retornar) |
| Cotações Tesouro Direto | radaropcoes.com (pública, sem auth) |
| Taxas macro (CDI/SELIC/IPCA) | BRAPI |
| Containerização | Docker Compose |

---

## Arquitetura

```
sgfp/
├── src/                        # API Express + TypeScript
│   ├── modules/                # Módulos de domínio
│   │   ├── auth/               # Login, logout, JWT
│   │   ├── asset-classes/
│   │   ├── assets/
│   │   ├── transactions/       # Multi-tenant: filtra por userId
│   │   ├── price-history/
│   │   ├── income-events/
│   │   ├── portfolio-items/
│   │   ├── portfolio-snapshots/ # Multi-tenant: snapshots por userId
│   │   ├── allocation/
│   │   ├── performance/        # Multi-tenant: performance por userId
│   │   ├── dividends/
│   │   ├── treasury/
│   │   ├── fixed-income/
│   │   └── irpf/
│   ├── jobs/                   # Crons automáticos (preços, proventos, snapshots, accrual)
│   ├── providers/              # Integrações externas
│   │   ├── brapi/
│   │   └── yahoo/
│   │       ├── quote.provider.ts   # Estratégia: Brapi primário → Yahoo fallback
│   │       └── yahoo.client.ts
│   └── shared/                 # Middlewares, erros, utilitários
├── prisma/
│   ├── schema.prisma           # Schema completo (multi-tenant com userId)
│   ├── migrations/             # Histórico de migrações
│   └── seed.ts                 # Seed do usuário admin
├── web/                        # Frontend Next.js
│   ├── app/
│   │   ├── (auth)/login/
│   │   └── (dashboard)/        # Layout + páginas do painel
│   │       ├── page.tsx        # Dashboard
│   │       ├── portfolio/
│   │       ├── treasury/
│   │       ├── fixed-income/
│   │       ├── transactions/
│   │       ├── allocation/
│   │       └── irpf/
│   ├── lib/
│   │   ├── api.ts              # Cliente Axios — baseURL=/api (proxy same-origin)
│   │   ├── auth.ts             # authService (login, logout, sig_auth flag)
│   │   └── hooks/
│   │       ├── useDashboard.ts
│   │       ├── usePortfolio.ts
│   │       ├── useTreasury.ts
│   │       ├── useFixedIncome.ts
│   │       └── useIrpf.ts
│   ├── middleware.ts            # Proteção de rotas — verifica sig_token ou sig_auth
│   └── next.config.ts          # Proxy rewrites: /api/* → http://api:3000/*
└── docker-compose.yml
```

---

## Como Executar

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Arquivo `.env` na raiz do projeto (copie de `.env.example`)

### 1. Configure o `.env`

```env
# Banco de dados
POSTGRES_DB=sgfp_db
APP_DB_USER=sgfp_user
APP_DB_PASSWORD=senha_segura
DB_PORT=5432

# API (roda na porta 3001)
PORT=3001
NODE_ENV=development
JWT_SECRET=sua-chave-secreta-longa
JWT_EXPIRES=8h
API_PORT=3001

# Admin inicial (criado via seed)
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=SuaSenhaForte123

# CORS — origem do browser
CORS_ORIGIN=http://localhost:3000

# Frontend (Next.js — roda na porta 3000)
# NEXT_PUBLIC_API_URL não é mais necessária para o browser (proxy same-origin)
# INTERNAL_API_URL é usada apenas pelo proxy server-side do Next.js
INTERNAL_API_URL=http://api:3001
WEB_PORT=3000

# BRAPI (cotações B3 + taxas CDI/SELIC/IPCA)
BRAPI_TOKEN=seu-token-brapi

# IA + Análise de carteira (módulo futuro)
GEMINI_API_KEY=sua-chave-gemini
SERPER_API_KEY=sua-chave-serper
```

### 2. Suba os containers

```bash
docker compose up -d
```

### 3. Aplique as migrations e crie o usuário admin

```bash
# Aplica todas as migrations (incluindo a multi-tenant)
docker compose exec api npx prisma migrate deploy

# Regenera o Prisma Client
docker compose exec api npx prisma generate

# Cria o usuário admin via seed
# PowerShell (Windows)
docker compose exec api node -e "require('child_process').execSync('npx tsx prisma/seed.ts', {stdio:'inherit'})"
# Linux / macOS
docker compose exec api npx tsx prisma/seed.ts
```

### 4. Acesse o sistema

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API (direto) | http://localhost:3001 |
| API (via proxy) | http://localhost:3000/api |
| Health check | http://localhost:3001/health |

---

## Autenticação

O SGFP usa JWT armazenado em cookie HttpOnly. O frontend acessa a API exclusivamente via proxy (`/api/*` → `http://api:3001/*`), garantindo **same-origin** em qualquer device — incluindo mobile — sem problemas de CORS ou `SameSite`.

### Fluxo

```
Browser → POST /api/auth/login
  Next.js reescreve → http://api:3001/auth/login
  API responde com:
    Set-Cookie: sig_token=<JWT>; HttpOnly; SameSite=Lax  ← cookie seguro
    body: { token, expiresIn }                           ← retrocompatibilidade
  Frontend seta sig_auth=1 (cookie JS legível pelo middleware)
```

1. Cookie `sig_token` (HttpOnly) — lido pela API em toda requisição
2. Cookie `sig_auth` (JS-readable) — lido pelo middleware Next.js para proteger rotas
3. Em resposta `401`, o interceptor Axios limpa `sig_auth` e redireciona para `/login`
4. O middleware Next.js bloqueia acesso direto a rotas protegidas sem os cookies

### Testar login via PowerShell

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/auth/login" `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"SuaSenhaForte123"}'
```

---

## Multi-Tenant — Carteiras por Usuário

O sistema suporta múltiplos usuários com carteiras completamente isoladas. Cada registro financeiro pertence a um usuário e é filtrado automaticamente a partir do JWT.

### Tabelas com `userId`

| Tabela | Isolada por usuário |
|---|---|
| `Account` | ✅ |
| `Transaction` | ✅ |
| `IncomeEvent` | ✅ |
| `PortfolioItem` | ✅ |
| `PortfolioSnapshot` | ✅ |
| `AllocationTarget` | ✅ |
| `Asset`, `AssetClass`, `PriceHistory` | ❌ Compartilhados (catálogo global) |

### Roles

| Role | Descrição |
|---|---|
| `ADMIN` | Acesso total — pode gerenciar outros usuários e dados globais |
| `VIEWER` | Acesso à própria carteira apenas — role padrão para novos usuários |

### Migration de preservação de dados

A migration `20260530_multi_tenant_add_userid` usa estratégia de 3 passos para não perder dados existentes:

```sql
-- 1. Adiciona userId nullable (não quebra nada)
ALTER TABLE "Transaction" ADD COLUMN "userId" TEXT;

-- 2. Popula com o id do primeiro ADMIN (dados existentes ficam intactos)
UPDATE "Transaction" SET "userId" = admin_id WHERE "userId" IS NULL;

-- 3. Torna NOT NULL + FK + índices
ALTER TABLE "Transaction" ALTER COLUMN "userId" SET NOT NULL;
```

### Módulos com refatoração multi-tenant concluída

- [x] `transactions` — create, findAll, findById, update, remove
- [x] `portfolio-snapshots` — generateSnapshot, generateSnapshotRange, listSnapshots, getSnapshotByDate
- [x] `performance` — getSummary, getTimeline, getByClass

### Módulos pendentes de refatoração

- [ ] `income-events`
- [ ] `dividends`
- [ ] `accounts`
- [ ] `allocation`
- [ ] `portfolio-items`
- [ ] `irpf`
- [ ] `treasury`
- [ ] `fixed-income`

---

## Variáveis de Ambiente — Referência Completa

| Variável | Onde é usada | Obrigatória | Descrição |
|---|---|---|---|
| `POSTGRES_DB` | db, api | ✅ | Nome do banco |
| `APP_DB_USER` | db, api | ✅ | Usuário do banco |
| `APP_DB_PASSWORD` | db, api | ✅ | Senha do banco |
| `JWT_SECRET` | api | ✅ | Chave de assinatura JWT |
| `JWT_EXPIRES` | api | ✅ | TTL do token (ex: `8h`) |
| `INITIAL_ADMIN_USERNAME` | api (seed) | ✅ | Username do admin |
| `INITIAL_ADMIN_PASSWORD` | api (seed) | ✅ | Senha do admin |
| `CORS_ORIGIN` | api | ✅ | Origem do browser (ex: `http://localhost:3000`) |
| `BRAPI_TOKEN` | api | ✅ | Token BRAPI para cotações |
| `INTERNAL_API_URL` | web (proxy) | ✅ | URL interna da API usada pelo proxy Next.js |
| `GEMINI_API_KEY` | api (futuro) | — | Google Gemini — análise de carteira com IA |
| `SERPER_API_KEY` | api (futuro) | — | Serper — busca de notícias e relatórios gerenciais |

> ⚠️ `NEXT_PUBLIC_API_URL` foi removida. O browser nunca acessa a API diretamente — tudo passa pelo proxy `/api/*`.

---

## Estratégia de Cotações — Brapi + Yahoo Finance

Todas as buscas de cotação passam por `src/providers/yahoo/quote.provider.ts`:

```
Ticker (ex: PETR4)
       │
       ▼
   1. BRAPI  ──────────────► resultado? ──► retorna
       │ (falhou / sem dado)
       ▼
   2. Yahoo Finance
       │ a) tenta ticker puro (PETR4)
       │ b) se não achar, tenta com .SA (PETR4.SA)
       └──────────────────────────────────────────► retorna ou null
```

---

## Estrutura da API

### Módulos

| Módulo | Prefixo | Descrição |
|---|---|---|
| Auth | `/auth` | Login, logout e geração de JWT |
| Asset Classes | `/asset-classes` | Classificação de ativos |
| Assets | `/assets` | Cadastro de ativos |
| Transactions | `/transactions` | Compras, vendas e movimentos |
| Price History | `/price-history` | Histórico OHLCV + importação |
| Income Events | `/income-events` | Proventos (dividendos, JCP, FII) |
| Portfolio Items | `/portfolio-items` | Posição consolidada por ativo |
| Portfolio Snapshots | `/portfolio-snapshots` | Snapshots DAILY/WEEKLY/MONTHLY |
| Allocation | `/allocation` | Distribuição por classe vs. meta |
| Performance | `/performance` | Rentabilidade da carteira |
| Dividends | `/dividends` | Resumo de proventos por período |
| Treasury | `/treasury` | Tesouro Direto — P&L, IR, IOF, resgate |
| Fixed Income | `/fixed-income` | Renda Fixa — accrual, IR/IOF, isenção |
| IRPF | `/irpf` | Cálculo de IR por ano-calendário |
| Health | `/health` | Status da API |

Todos os endpoints (exceto `/auth/*` e `/health`) exigem autenticação via cookie `sig_token` ou header `Authorization: Bearer <token>`.

---

## Módulo IRPF

### Endpoint

```
GET /irpf?year=2025
```

Retorna um objeto `IrpfSummary` com:

| Campo | Descrição |
|---|---|
| `monthlyGains` | Ganho de capital mês × classe (swing + day trade) |
| `incomeRows` | Rendimentos recebidos (dividendos isentos, FII, JCP tributável) |
| `positions` | Posição em 31/12 para a ficha de Bens e Direitos |
| `darfs` | DARFs a recolher por mês, com base de cálculo e vencimento |
| `lossCarryForward` | Saldo de prejuízo acumulado não compensado no ano |

### Regras implementadas

| Classe | Isenção R$20k/mês | Alíquota Swing | Alíquota Day Trade |
|---|---|---|---|
| Ações (`DOMESTIC_STOCK`) | ✅ | 15% | 20% |
| ETF nacional | ✅ | 15% | 20% |
| FII | ❌ | 20% | 20% |
| BDR | ❌ | 15% | 20% |

- **Custo médio ponderado** calculado com todo o histórico de BUYs (não só do ano)
- **Day trade detectado automaticamente**: mesmo `assetId` com BUY e SELL na mesma data
- **Compensação de prejuízos sequencial por classe**
- **DARFs** geradas por mês × grupo com vencimento no último dia do mês seguinte

---

## Jobs Automáticos (Crons)

### Calendário diário (seg–sex)

| Horário BRT | Job | Descrição |
|---|---|---|
| 10:00–17:30 | `price-import` | Cotações B3 + Yahoo (5 execuções) |
| 18:00 (sex) | `snapshot` | Snapshot semanal |
| 18:30 | `snapshot` | Snapshot diário |
| 18:45 | `fixed-income-accrual` | Accrual de renda fixa privada |
| 19:00 | `treasury-import` | PU do Tesouro Direto via radaropcoes |
| Dom 06:00 | `income-import` | Proventos via Yahoo Finance |

### Executar jobs manualmente

```bash
# Importar preços atuais
docker compose exec api node -e "const { importCurrentPrices } = require('./dist/jobs/price-import.cron'); importCurrentPrices().then(r => console.log(JSON.stringify(r, null, 2)))"

# Importar proventos
docker compose exec api node -e "const { importAllIncomeEvents } = require('./dist/jobs/income-import.cron'); importAllIncomeEvents().then(r => console.log(JSON.stringify(r, null, 2)))"

# Importar preços do Tesouro Direto
docker compose exec api node -e "const { importTreasuryPrices } = require('./dist/jobs/treasury-import.cron'); importTreasuryPrices().then(r => console.log(JSON.stringify(r, null, 2)))"

# Rodar accrual de renda fixa
docker compose exec api node -e "const { runFixedIncomeAccrual } = require('./dist/jobs/fixed-income-accrual.cron'); runFixedIncomeAccrual().then(r => console.log(JSON.stringify(r, null, 2)))"
```

### Gerar snapshots DAILY retroativos (últimos 90 dias)

```powershell
$headers = @{ Authorization = "Bearer SEU_TOKEN_AQUI" }

$today = Get-Date
for ($i = 90; $i -ge 0; $i--) {
    $date = $today.AddDays(-$i).ToString("yyyy-MM-dd")
    try {
        Invoke-RestMethod -Method Post `
          -Uri "http://localhost:3000/api/portfolio-snapshots/generate" `
          -Headers $headers `
          -ContentType "application/json" `
          -Body ('{"referenceDate":"' + $date + '","period":"DAILY"}')
        Write-Host "OK: $date"
    } catch {
        Write-Host "SKIP: $date - $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 150
}
```

> ℹ️ O proxy Next.js está em `http://localhost:3000/api`. Datas sem preço disponível retornarão `SKIP` — comportamento esperado.

---

## Banco de Dados

### Comandos essenciais

```bash
npx prisma migrate dev --name descricao-da-mudanca
npx prisma migrate deploy
npx prisma studio
npx prisma generate
```

### Models principais

| Model | Descrição | Multi-tenant |
|---|---|---|
| `User` | Usuário do sistema | — |
| `AssetClass` | Classificação macro dos ativos | Global |
| `Asset` | Ativo individual — ticker, nome, classe | Global |
| `Transaction` | Compras, vendas e movimentos | ✅ por `userId` |
| `PriceHistory` | OHLCV diário por ativo | Global |
| `IncomeEvent` | Proventos recebidos | ✅ por `userId` |
| `PortfolioItem` | Posição consolidada por ativo | ✅ por `userId` |
| `PortfolioSnapshot` | Fotografia do portfólio (DAILY/WEEKLY) | ✅ por `userId` |
| `AllocationTarget` | Meta de alocação por classe | ✅ por `userId` |
| `Account` | Contas por instituição | ✅ por `userId` |

---

## Frontend

### Tecnologias

| Tecnologia | Versão / Detalhe |
|---|---|
| Next.js | 15 — App Router |
| Tailwind CSS | v4 |
| React Query | `@tanstack/react-query` |
| Recharts | Gráficos (AreaChart, PieChart) |
| React Hook Form | Validação de formulários |
| Zod | Schema de validação |
| Axios | Cliente HTTP com interceptors |
| Lucide React | Ícones |
| date-fns | Formatação de datas com locale pt-BR |

### Design System

- **Paleta**: dark moderno inspirado em Linear/Vercel — superfícies Zinc com hierarquia clara
- **Primário**: Azul-índigo (`#6366f1` / indigo-500)
- **Tipografia**: Geist (display e body)
- **Tokens CSS**: superfícies, texto, semânticas (success/warning/error), espaçamentos, raios e sombras

> ⚠️ Tokens `--color-surface-3`, `--color-primary-active` e `--color-error-muted` estão referenciados no código mas ainda não definidos em `globals.css`. Pendente de correção.

### Rotas

| Rota | Status | Descrição |
|---|---|---|
| `/login` | ✅ Implementado | Tela de login com cookie HttpOnly |
| `/` | ✅ Implementado | Dashboard — KPIs, evolução patrimonial, alocação |
| `/transactions` | ✅ Implementado | Histórico de transações com gráfico de movimentações |
| `/irpf` | ✅ Implementado | IRPF — ganho de capital, DARFs, rendimentos, bens e direitos |
| `/portfolio` | 🔲 Planejado | Posições, P&L, preço médio por ativo |
| `/treasury` | 🔲 Planejado | Tesouro Direto — títulos, P&L líquido |
| `/fixed-income` | 🔲 Planejado | Renda Fixa — accrual, isenção, status de vencimento |
| `/allocation` | 🔲 Planejado | Alocação por classe vs. meta |
| `/analysis` | 🔲 Planejado | Análise inteligente da carteira (motor de regras + IA) |

---

## Problemas Resolvidos

### Login sem usuário no banco
**Causa:** `docker-compose.yml` usava `APP_USERNAME`/`APP_PASSWORD` em vez de `INITIAL_ADMIN_USERNAME`/`INITIAL_ADMIN_PASSWORD`.
**Solução:** Atualizar variáveis no `docker-compose.yml` e `.env`, recriar container e rodar seed.

### Migrations não aplicadas no container
**Causa:** `Dockerfile` não copiava `prisma/migrations` para o estágio `runner`.
**Solução:** Adicionar `COPY --from=builder /app/prisma ./prisma` no estágio `runner`.

### Login não funcionava no celular (mobile)
**Causa:** API (porta 3001) e frontend (porta 3000) eram origens diferentes. O browser bloqueava o cookie `sig_token` com `SameSite=Lax` ao cruzar origens.
**Solução:** Proxy transparente via `next.config.ts` rewrites (`/api/*` → `http://api:3001/*`). Agora tudo é same-origin. `baseURL` do Axios foi alterada para `/api`.

### Middleware Next.js não bloqueava rotas sem login
**Causa:** O middleware verificava cookie `sig_token` que nunca chegava ao Edge Runtime pois era emitido por origem diferente.
**Solução:** Com o proxy same-origin resolvido, o cookie chega corretamente. Cookie auxiliar `sig_auth` adicionado como flag legível pelo middleware.

### Erro de CORS no login pelo browser
**Causa:** `CORS_ORIGIN` apontava para endereço interno Docker (`http://web:3001`).
**Solução:** Alterar `CORS_ORIGIN` para `http://localhost:3000`.

### queryKeys conflitantes entre useDashboard e usePortfolio
**Causa:** Hooks duplicados usavam as mesmas `queryKey`s, causando colisão de cache no React Query.
**Solução:** Prefixar queryKeys de `usePortfolio.ts` com `portfolio-`.

### Gráficos da dashboard em empty state
**Causa:** Snapshots DAILY gerados com datas antigas, fora do intervalo dos últimos 90 dias.
**Solução:** Script PowerShell de geração retroativa (ver seção *Jobs Automáticos*).

### Cotações exigindo sufixo `.SA`
**Causa:** Yahoo Finance exige `.SA` para tickers B3.
**Solução:** `quote.provider.ts` com estratégia Brapi primário → Yahoo fallback.

### SyntaxError no SWC — mistura de `||` com `??`
**Causa:** SWC rejeita expressões que misturam `||` e `??` sem parênteses explícitos.
**Solução:** Extrair a subexpressão com `??` para variável separada.

### TypeScript errors no irpf.service.ts (build Docker)
**Causa:** `assetId: { not: null }` — Prisma não aceita `null` no filtro `not`; guard desnecessário em `ev.asset`.
**Solução:** Trocar `{ not: null }` por `{ not: undefined }` e remover guard redundante.

---

## Lógica Financeira

### IR Regressivo (Tesouro Direto e Renda Fixa)

| Prazo desde a compra | Alíquota IR |
|---|---|
| Até 180 dias | 22,5% |
| 181 a 360 dias | 20,0% |
| 361 a 720 dias | 17,5% |
| Acima de 720 dias | 15,0% |

### Tributação por Subtipo (Renda Fixa Privada)

| Subtipo | IR | IOF |
|---|---|---|
| CDB | Regressivo | Sim (30 dias) |
| LCI / LCA / LIG | **Isento (PF)** | Não |
| CRI / CRA | **Isento (PF)** | Não |
| Debênture incentivada | **Isento (PF)** | Não |
| Debênture comum | Regressivo | Sim |

### Accrual por Indexador (Renda Fixa Privada)

| Indexer | Fórmula |
|---|---|
| CDI / SELIC | `principal × (1 + baseRate × purchaseRate)^(dias/252)` |
| IPCA / IGPM | `principal × (1 + ipca + purchaseRate)^(dias/365)` |
| PREFIXADO | `principal × (1 + purchaseRate)^(dias/365)` |

### IRPF — Renda Variável (ativos brasileiros)

| Classe | Isenção R$20k/mês | Swing Trade | Day Trade |
|---|---|---|---|
| Ações | ✅ | 15% | 20% |
| ETF nacional | ✅ | 15% | 20% |
| FII | ❌ | 20% | 20% |
| BDR | ❌ | 15% | 20% |
| Dividendos / FII_INCOME | — | Isento | — |
| JCP | — | 15% retido na fonte | — |

---

## Roadmap

### ✅ Concluído — API

- [x] CRUD completo de ativos, classes, transações, proventos e contas
- [x] Importação de preços via BRAPI e Yahoo Finance
- [x] Snapshots DAILY / WEEKLY / MONTHLY com geração retroativa
- [x] Crons automáticos (preços, proventos, snapshots, accrual, tesouro)
- [x] Endpoints de alocação, performance e dividendos
- [x] Módulo Tesouro Direto — P&L (WAVG), IR/IOF, cron radaropcoes, resgate
- [x] Módulo Renda Fixa Privada — accrual por indexador, IR/IOF, isenção, resgate
- [x] Autenticação JWT com cookie HttpOnly
- [x] `quote.provider.ts` — estratégia Brapi primário / Yahoo Finance fallback
- [x] Módulo IRPF — `GET /irpf?year=YYYY`
- [x] **Multi-tenant (Fase 1 parcial)** — `userId` no schema + migration + transactions, snapshots e performance refatorados

### ✅ Concluído — Frontend

- [x] Estrutura Next.js 15 (App Router) com Tailwind CSS v4
- [x] Design system próprio — tokens CSS, paleta dark, tipografia Geist
- [x] Tela de login com validação
- [x] Layout do dashboard com sidebar responsiva
- [x] **Proxy same-origin** — `next.config.ts` rewrites + Axios `baseURL=/api`
- [x] Cookie HttpOnly funcionando em qualquer device/browser
- [x] Middleware Next.js protegendo rotas (corrigido para funcionar em mobile)
- [x] Dashboard — KPIs reais, gráfico de evolução (90 dias), gráfico de alocação
- [x] `NewTransactionDrawer` — wizard 4 passos com busca Brapi/Yahoo
- [x] Página de Transações — histórico mensal com gráfico
- [x] Página IRPF — ganho de capital, DARFs, rendimentos, bens e direitos

### 🔴 Alta Prioridade

- [ ] **Multi-tenant (Fase 1 — concluir)** — refatorar `income-events`, `dividends`, `accounts`, `allocation`, `portfolio-items`, `irpf`, `treasury`, `fixed-income`
- [ ] **Fase 2 — Cadastro de usuário** — `POST /auth/register` com username/email/senha + tela de cadastro no frontend
- [ ] **Corrigir tokens CSS inconsistentes** — `--color-surface-3`, `--color-primary-active`, `--color-error-muted`
- [ ] **Tesouro Direto — import histórico via CSV** (Tesouro Transparente)
- [ ] **Adicionar link IRPF no menu lateral**

### 🟡 Média Prioridade

- [ ] Página `/portfolio` — posições, P&L, preço médio, % da carteira
- [ ] Página `/treasury` — tabela de títulos com P&L líquido
- [ ] Página `/fixed-income` — accrual, isenção, status de vencimento
- [ ] Página `/allocation` — gráfico pizza interativo
- [ ] Página `/analysis` — Análise inteligente da carteira
- [ ] **Fase 3 — Login com Google OAuth** — NextAuth.js + provider Google + criação automática de usuário por e-mail
- [ ] IRR / XIRR — retorno real considerando timing de aportes
- [ ] Benchmark — comparar carteira vs. CDI, IBOV e IPCA
- [ ] Dark/light mode toggle
- [ ] Testes automatizados nos services críticos

### 🟢 Baixa Prioridade

- [ ] Importação via nota de corretagem (PDF/XLSX)
- [ ] Alertas de preço (e-mail ou webhook)
- [ ] Proventos previstos (calendário futuro)
- [ ] Rate limiting nos endpoints públicos
- [ ] Logs estruturados (Winston/Pino)
- [ ] CI/CD com GitHub Actions
- [ ] **Renomear projeto de SIG para SGFP** — ver checklist abaixo

---

## Fase 3 — Login com Google OAuth (Planejado)

Dependência: Fase 1 e Fase 2 concluídas.

**Fluxo pretendido:**
```
Usuário clica "Entrar com Google" na tela de login
  → NextAuth.js redireciona para Google OAuth
  → Google retorna email + nome
  → Backend verifica se User existe pelo email
    → Existe: atualiza lastLoginAt e emite JWT
    → Não existe: cria User (role=VIEWER) e emite JWT
  → Cookie sig_token setado normalmente (mesmo fluxo)
```

**O que é necessário:**
- Conta Google Cloud Console com projeto OAuth configurado
- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`
- `NextAuth.js` instalado no frontend (`web/`)
- Campo `email` já existe no modelo `User` (adicionado na migration multi-tenant)
- Endpoint `POST /auth/google` no backend para receber o token Google e emitir JWT

---

## Módulo de Análise (Planejado)

Abordagem híbrida em duas camadas:

### Camada 1 — Motor de Regras (instantâneo, sem IA)

```
GET /analysis/portfolio  →  sinais automáticos por ativo
```

| Sinal | Fonte |
|---|---|
| Posição vs. % ideal (rebalanceamento) | `allocation` |
| Rentabilidade vs. custo médio | `portfolio-items` |
| Classe subponderada / sobreponderada | `allocation` |
| Sem proventos nos últimos 12 meses | `income-events` |
| Lucro realizável acima de X% | `portfolio-items` |
| Tendência de preço vs. média histórica | `price-history` |

### Camada 2 — Análise com IA + Web Search (sob demanda)

```
POST /analysis/ai  →  { ticker }  →  análise em linguagem natural
```

1. Monta contexto interno (posição, custo médio, rentabilidade, proventos)
2. Busca na web via **Serper API** — relatórios gerenciais (RI), notícias e resultados trimestrais
3. Envia contexto + web search para **Google Gemini 2.0 Flash**
4. Retorna análise em português com tese, pontos positivos, riscos e recomendação
5. Salva em cache no PostgreSQL (`ai_analysis_cache`) com TTL de 24h

---

## Checklist de Renomeação — SIG → SGFP

### Identidade visual (frontend)
- [ ] `web/app/(auth)/login/page.tsx` — texto "SIG"
- [ ] `web/app/(dashboard)/layout.tsx` — logo e texto na sidebar
- [ ] `web/app/layout.tsx` — metadata `title` e `description`
- [ ] `web/middleware.ts` — cookie `sig_token` → `sgfp_token`
- [ ] `web/lib/auth.ts` — constante `AUTH_FLAG_KEY = 'sig_auth'` → `'sgfp_auth'`

### Docker e infraestrutura
- [ ] `docker-compose.yml` — `name: sig` → `name: sgfp`
- [ ] `.env` / `.env.example` — variáveis e comentários com "SIG"

### Pacotes
- [ ] `package.json` — `"name": "sig-api"` → `"sgfp-api"`
- [ ] `web/package.json` — `"name": "sig-web"` → `"sgfp-web"`

### Banco de dados
- [ ] `POSTGRES_DB`: `sig_db` → `sgfp_db` (requer backup: `docker compose exec db pg_dump -U $APP_DB_USER $POSTGRES_DB > backup.sql`)

---

## Contribuindo

```bash
git checkout -b feat/nome-da-feature
git commit -m "feat(module): descrição da mudança"
git push origin feat/nome-da-feature
```

---

*SGFP v0.5.0 — uso pessoal*
