# SGFP — Sistema de Gestão de Finanças Pessoais

Plataforma pessoal de gestão financeira com foco em investimentos. Permite cadastrar ativos (ações, FIIs, ETFs, BDRs, Tesouro Direto e renda fixa privada), registrar transações, importar histórico de preços e proventos automaticamente, calcular snapshots do portfólio, medir performance, calcular IRPF e visualizar tudo em um frontend moderno.

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
| Autenticação | JWT (Bearer token) — usuário criado via seed |
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
│   │   ├── auth/
│   │   ├── asset-classes/
│   │   ├── assets/
│   │   ├── transactions/
│   │   ├── price-history/
│   │   ├── income-events/
│   │   ├── portfolio-items/
│   │   ├── portfolio-snapshots/
│   │   ├── allocation/
│   │   ├── performance/
│   │   ├── dividends/
│   │   ├── treasury/
│   │   ├── fixed-income/
│   │   └── irpf/               # ← NOVO: motor de cálculo IRPF
│   ├── jobs/                   # Crons automáticos (preços, proventos, snapshots, accrual)
│   ├── providers/              # Integrações externas
│   │   ├── brapi/              # BRAPI — cotações B3 e taxas macro
│   │   └── yahoo/
│   │       ├── quote.provider.ts   # Estratégia: Brapi primário → Yahoo fallback
│   │       └── yahoo.client.ts
│   └── shared/                 # Middlewares, erros, utilitários
├── prisma/
│   ├── schema.prisma           # Schema completo do banco
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
│   │       └── irpf/           # ← NOVO: página IRPF
│   ├── lib/
│   │   ├── api.ts              # Cliente Axios com interceptors JWT / 401
│   │   ├── auth.ts             # authService (login, logout, token)
│   │   ├── types/
│   │   │   └── irpf.ts         # ← NOVO: tipos TypeScript do módulo IRPF
│   │   └── hooks/
│   │       ├── useDashboard.ts
│   │       ├── usePortfolio.ts
│   │       ├── useTreasury.ts
│   │       ├── useFixedIncome.ts
│   │       └── useIrpf.ts      # ← NOVO: hook React Query para IRPF
│   └── components/
│       └── transactions/
│           └── NewTransactionDrawer.tsx
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
CORS_ORIGIN=http://localhost:3001

# Frontend (Next.js — roda na porta 3000)
NEXT_PUBLIC_API_URL=http://localhost:3001
INTERNAL_API_URL=http://api:3001
WEB_PORT=3000

# BRAPI (cotações B3 + taxas CDI/SELIC/IPCA)
BRAPI_TOKEN=seu-token-brapi

# IA + Análise de carteira (módulo futuro)
GEMINI_API_KEY=sua-chave-gemini
SERPER_API_KEY=sua-chave-serper
```

> ⚠️ `NEXT_PUBLIC_API_URL` é incorporada **no build** do Next.js. Mudanças exigem `docker compose build web`.
> ⚠️ Sem `INITIAL_ADMIN_PASSWORD` definida, o seed não cria o usuário admin.

### 2. Suba os containers

```bash
docker compose up -d
```

### 3. Crie o usuário admin

```bash
# PowerShell (Windows)
docker compose exec api node -e "require('child_process').execSync('npx tsx prisma/seed.ts', {stdio:'inherit'})"

# Linux / macOS
docker compose exec api npx tsx prisma/seed.ts
```

### 4. Acesse o sistema

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/health |

---

## Autenticação

O SGFP usa autenticação por JWT. Não há registro público — o usuário admin é criado via seed.

### Fluxo

1. `POST /auth/login` com `{ username, password }` → retorna `{ token, expiresIn }`
2. O token é armazenado em `localStorage` e cookie (`sig_token`, 8h)
3. O cliente Axios injeta `Authorization: Bearer <token>` em toda requisição
4. Em resposta `401`, o interceptor remove o token e redireciona para `/login`
5. O middleware Next.js protege rotas por navegação SSR

### Testar login via PowerShell

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/auth/login" `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"SuaSenhaForte123"}'
```

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
| `CORS_ORIGIN` | api | ✅ | Origem do browser |
| `BRAPI_TOKEN` | api | ✅ | Token BRAPI para cotações |
| `NEXT_PUBLIC_API_URL` | web (build) | ✅ | URL da API usada pelo browser |
| `INTERNAL_API_URL` | web (SSR) | ✅ | URL da API usada pelo servidor Next.js |
| `GEMINI_API_KEY` | api (futuro) | — | Google Gemini — análise de carteira com IA |
| `SERPER_API_KEY` | api (futuro) | — | Serper — busca de notícias e relatórios gerenciais |

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
| Auth | `/auth` | Login e geração de JWT |
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
| **IRPF** | **`/irpf`** | **Cálculo de IR por ano-calendário** |
| Health | `/health` | Status da API |

Todos os endpoints (exceto `/auth/*` e `/health`) exigem:
```
Authorization: Bearer <token>
```

---

## Módulo IRPF

### Visão geral

O módulo IRPF calcula, do lado do servidor, todas as obrigações fiscais de renda variável brasileira para um dado ano-calendário, com base nas transações registradas no sistema.

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
- **Compensação de prejuízos sequencial por classe**: saldo de Ações não compensa FIIs (e vice-versa)
- **DARFs**: geradas por mês × grupo (Renda Variável / FIIs / Day Trade), com vencimento no último dia do mês seguinte
- Renda Fixa e Tesouro Direto têm IR retido na fonte — **não aparecem no ganho de capital**

### Página frontend `/irpf`

- Seletor de ano-calendário (últimos 6 anos, padrão = ano anterior)
- **4 KPIs**: IR total devido, IR retido na fonte, rendimentos isentos, saldo de prejuízo acumulado
- **Seção Ganho de Capital**: tabela mês × classe com receita de venda, custo, lucro/prejuízo, compensado, base de cálculo, alíquota e IR
- **Seção DARFs**: competência, grupo, base, alíquota, valor a recolher e vencimento
- **Seção Rendimentos**: dividendos isentos, FII_INCOME isento, JCP tributável com IR retido
- **Seção Bens e Direitos**: posição atual com custo médio × quantidade = valor a declarar
- Disclaimer destacando que Renda Fixa e Tesouro têm IR retido na fonte

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
          -Uri "http://localhost:3001/portfolio-snapshots/generate" `
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

> ℹ️ Datas sem preço disponível (fins de semana / feriados) retornarão `SKIP` — comportamento esperado.

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

| Model | Descrição |
|---|---|
| `User` | Usuário do sistema |
| `AssetClass` | Classificação macro dos ativos |
| `Asset` | Ativo individual — ticker, nome, classe |
| `Transaction` | Compras, vendas e movimentos |
| `PriceHistory` | OHLCV diário por ativo |
| `IncomeEvent` | Proventos recebidos |
| `PortfolioItem` | Posição consolidada por ativo |
| `PortfolioSnapshot` | Fotografia do portfólio (DAILY/WEEKLY/MONTHLY) |
| `AllocationTarget` | Meta de alocação por classe |
| `Account` | Contas por instituição |

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

### Hooks de dados

| Hook | Arquivo | Endpoints chamados |
|---|---|---|
| `useSnapshots` | `useDashboard.ts` | `GET /portfolio-snapshots` |
| `useAllocation` | `useDashboard.ts` | `POST /allocation/calculate` |
| `usePerformance` | `useDashboard.ts` | `GET /performance/summary` |
| `useDividends` | `useDashboard.ts` | `GET /dividends/summary` |
| `usePortfolioItems` | `usePortfolio.ts` | `GET /portfolio-items` |
| `useAllocation` | `usePortfolio.ts` | `POST /allocation/calculate` |
| `usePerformance` | `usePortfolio.ts` | `GET /performance/summary` |
| `useTreasury` | `useTreasury.ts` | `GET /treasury` |
| `useFixedIncome` | `useFixedIncome.ts` | `GET /fixed-income` |
| **`useIrpf(year)`** | **`useIrpf.ts`** | **`GET /irpf?year=YYYY`** |

### Rotas

| Rota | Status | Descrição |
|---|---|---|
| `/login` | ✅ Implementado | Tela de login |
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

**Causa:** `docker-compose.yml` usava `APP_USERNAME`/`APP_PASSWORD` (nomenclatura antiga) em vez de `INITIAL_ADMIN_USERNAME`/`INITIAL_ADMIN_PASSWORD`.
**Solução:** Atualizar variáveis no `docker-compose.yml` e `.env`, recriar container e rodar seed.

### Migrations não aplicadas no container

**Causa:** `Dockerfile` não copiava `prisma/migrations` para o estágio `runner`.
**Solução:** Adicionar `COPY --from=builder /app/prisma ./prisma` no estágio `runner`.

### Erro de CORS no login pelo browser

**Causa:** `CORS_ORIGIN=http://web:3001` (endereço interno Docker). O browser envia `Origin: http://localhost:3001`.
**Solução:** Alterar `CORS_ORIGIN` para `http://localhost:3001` no `.env`.

### baseURL do Axios apontando para porta errada

**Causa:** Fallback de `API_URL` em `web/lib/api.ts` estava como `http://localhost:3000` (porta do Next.js).
**Solução:** Corrigir fallback para `http://localhost:3001`.

### queryKeys conflitantes entre useDashboard e usePortfolio

**Causa:** Hooks duplicados usavam as mesmas `queryKey`s, causando colisão de cache no React Query.
**Solução:** Prefixar queryKeys de `usePortfolio.ts` com `portfolio-` (`portfolio-allocation`, `portfolio-performance`).

### Gráficos da dashboard em empty state

**Causa:** Snapshots DAILY gerados com datas de 2024, fora do intervalo dos últimos 90 dias.
**Solução:** Executar script PowerShell de geração retroativa (ver seção *Jobs Automáticos*).

### Cotações exigindo sufixo `.SA`

**Causa:** Yahoo Finance exige `.SA` para tickers B3, tornando o fluxo inconsistente.
**Solução:** Criação de `quote.provider.ts` com estratégia Brapi primário → Yahoo fallback.

### SyntaxError no SWC — mistura de `||` com `??`

**Causa:** SWC rejeita expressões que misturam `||` e `??` sem parênteses explícitos.
**Solução:** Extrair a subexpressão com `??` para variável separada em `NewTransactionDrawer.tsx`.

### TypeScript errors no irpf.service.ts (build Docker)

**Causa:** 3 erros de tipo:
1. `assetId: { not: null }` — Prisma não aceita `null` no filtro `not`
2. `ev.asset` inferido como inexistente por guard `if (!ev.asset)` desnecessário — `assetId` é não-nulo no schema

**Solução:**
- Trocar `{ not: null }` por `{ not: undefined }`
- Remover guard `if (!ev.asset)` e reescrever lógica de `incomeMap` com verificação de `existing` explícita

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
- [x] Autenticação JWT com usuário criado via seed
- [x] `quote.provider.ts` — estratégia Brapi primário / Yahoo Finance fallback
- [x] **Módulo IRPF** — `GET /irpf?year=YYYY` com ganho de capital, compensação de prejuízos, day trade automático, rendimentos, bens e DARFs

### ✅ Concluído — Frontend

- [x] Estrutura Next.js 15 (App Router) com Tailwind CSS v4
- [x] Design system próprio — tokens CSS, paleta dark, tipografia Geist
- [x] Tela de login com validação
- [x] Layout do dashboard com sidebar responsiva
- [x] Cliente Axios com interceptors JWT e redirect em 401
- [x] Middleware Next.js para proteção de rotas
- [x] **Dashboard** — KPIs reais, gráfico de evolução (90 dias), gráfico de alocação
- [x] `NewTransactionDrawer` — wizard 4 passos com busca Brapi/Yahoo e cadastro automático de ativo
- [x] **Página de Transações** — histórico mensal com gráfico de movimentações
- [x] **Página IRPF** — ganho de capital, DARFs, rendimentos, bens e direitos, seletor de ano
- [x] `useIrpf(year)` — hook React Query para o módulo IRPF
- [x] `web/lib/types/irpf.ts` — tipos TypeScript do módulo IRPF

### 🔴 Alta Prioridade

- [ ] **Renomear projeto de SIG para SGFP** — ver checklist abaixo
- [ ] **Corrigir tokens CSS inconsistentes** — `--color-surface-3`, `--color-primary-active`, `--color-error-muted`
- [ ] **Tesouro Direto — import histórico via CSV** (Tesouro Transparente)
- [ ] **Adicionar link IRPF no menu lateral** — sidebar ainda não tem o item

### 🟡 Média Prioridade

- [ ] Página `/portfolio` — posições, P&L, preço médio, % da carteira
- [ ] Página `/treasury` — tabela de títulos com P&L líquido
- [ ] Página `/fixed-income` — accrual, isenção, status de vencimento
- [ ] Página `/allocation` — gráfico pizza interativo
- [ ] **Página `/analysis` — Análise inteligente da carteira** (ver seção abaixo)
- [ ] IRR / XIRR — retorno real considerando timing de aportes
- [ ] Benchmark — comparar carteira vs. CDI, IBOV e IPCA
- [ ] Dark/light mode toggle
- [ ] Testes automatizados nos services críticos

### 🟢 Baixa Prioridade

- [ ] Importação via nota de corretagem (PDF/XLSX)
- [ ] Alertas de preço (e-mail ou webhook)
- [ ] Multi-carteira por usuário
- [ ] Proventos previstos (calendário futuro)
- [ ] Rate limiting nos endpoints públicos
- [ ] Logs estruturados (Winston/Pino)
- [ ] CI/CD com GitHub Actions

---

## Módulo de Análise (Planejado)

Abordagem híbrida em duas camadas:

### Camada 1 — Motor de Regras (instantâneo, sem IA)

```
GET /analysis/portfolio  →  sinais automáticos por ativo
```

Cada ativo recebe um **score** e lista de **sinais** baseados nos dados internos:

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

**Fluxo:**
1. Monta contexto interno (posição, custo médio, rentabilidade, proventos)
2. Busca na web via **Serper API** — relatórios gerenciais (RI), notícias e resultados trimestrais
3. Envia contexto + web search para **Google Gemini 2.0 Flash** (gratuito)
4. Retorna análise em português com: tese, pontos positivos, riscos e recomendação
5. Salva resultado em cache no PostgreSQL (`ai_analysis_cache`) com TTL de 24h

**Variáveis de ambiente necessárias:** `GEMINI_API_KEY` e `SERPER_API_KEY` (já documentadas acima)

---

## Checklist de Renomeação — SIG → SGFP

### Identidade visual (frontend)
- [ ] `web/app/(auth)/login/page.tsx` — texto "SIG"
- [ ] `web/app/(dashboard)/layout.tsx` — logo e texto na sidebar
- [ ] `web/app/layout.tsx` — metadata `title` e `description`
- [ ] `web/middleware.ts` — cookie `sig_token` → `sgfp_token`
- [ ] `web/lib/auth.ts` — constante `TOKEN_KEY = 'sig_token'` → `'sgfp_token'`

### Docker e infraestrutura
- [ ] `docker-compose.yml` — `name: sig` → `name: sgfp`
- [ ] `.env` / `.env.example` — variáveis e comentários com "SIG"

### Pacotes
- [ ] `package.json` — `"name": "sig-api"` → `"sgfp-api"`
- [ ] `web/package.json` — `"name": "sig-web"` → `"sgfp-web"`

### Banco de dados
- [ ] `POSTGRES_DB`: `sig_db` → `sgfp_db` (requer backup antes: `docker compose exec db pg_dump -U $APP_DB_USER $POSTGRES_DB > backup.sql`)

---

## Contribuindo

```bash
git checkout -b feat/nome-da-feature
git commit -m "feat(module): descrição da mudança"
git push origin feat/nome-da-feature
```

---

*SGFP v0.4.0 — uso pessoal*
