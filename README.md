# SGFP — Sistema de Gestão de Finanças Pessoais

Plataforma pessoal de gestão financeira com foco em investimentos. Permite cadastrar ativos (ações, FIIs, ETFs, BDRs, Tesouro Direto e renda fixa privada), registrar transações, importar histórico de preços e proventos automaticamente, calcular snapshots do portfólio, medir performance e visualizar tudo em um frontend moderno.

> 📌 **Documentação viva** — este README reflete o estado real do projeto. Atualize sempre que implementar, corrigir ou planejar algo.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 + TypeScript |
| API Framework | NestJS |
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
├── src/                  # API NestJS
│   ├── modules/          # Módulos de domínio (auth, assets, portfolio, treasury, fixed-income…)
│   ├── jobs/             # Crons automáticos (preços, proventos, snapshots, accrual)
│   ├── providers/        # Integrações externas
│   │   ├── brapi/        # BRAPI — cotações B3 e taxas macro
│   │   └── yahoo/
│   │       ├── quote.provider.ts   # Estratégia: Brapi primário → Yahoo fallback
│   │       └── yahoo.client.ts     # Cliente HTTP Yahoo Finance (mantido para retrocompat.)
│   └── shared/           # Middlewares, erros, utilitários
├── prisma/
│   ├── schema.prisma     # Schema completo do banco
│   ├── migrations/       # Histórico de migrações
│   └── seed.ts           # Seed do usuário admin
├── web/                  # Frontend Next.js
│   ├── app/
│   │   ├── (auth)/login/ # Tela de login
│   │   └── (dashboard)/  # Layout + páginas do painel
│   ├── lib/
│   │   ├── api.ts        # Cliente Axios com interceptors JWT / 401
│   │   ├── auth.ts       # authService (login, logout, token)
│   │   └── hooks/        # useDashboard, usePortfolio, useTreasury, useFixedIncome
│   └── components/
│       └── transactions/
│           └── NewTransactionDrawer.tsx  # Drawer de novo lançamento (wizard 4 passos)
└── docker-compose.yml    # Orquestração: db + api + web
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

# API (NestJS — roda na porta 3000)
PORT=3000
NODE_ENV=development
JWT_SECRET=sua-chave-secreta-longa
JWT_EXPIRES=8h
API_PORT=3000

# Admin inicial (criado via seed)
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=SuaSenhaForte123

# CORS — origem do browser (deve ser localhost, não o nome do container)
CORS_ORIGIN=http://localhost:3001

# Frontend (Next.js — roda na porta 3001)
# NEXT_PUBLIC_API_URL é embutida no build; requer rebuild após mudança
NEXT_PUBLIC_API_URL=http://localhost:3001/api
INTERNAL_API_URL=http://api:3000
WEB_PORT=3001

# BRAPI (cotações B3 + taxas CDI/SELIC/IPCA)
BRAPI_TOKEN=seu-token-brapi

# Docker
DOCKER_NETWORK_NAME=sgfp_network
```

> ⚠️ `NEXT_PUBLIC_API_URL` é incorporada **no build** do Next.js. Mudanças exigem `docker compose build web`.
> ⚠️ Sem `INITIAL_ADMIN_PASSWORD` definida, o seed não cria o usuário admin.
> ⚠️ **Não confunda as portas:** Next.js = 3000 (interno), exposto na 3001; NestJS/API = 3001 (interno), exposto na 3000. Veja `docker-compose.yml` para os mapeamentos exatos.

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

Saída esperada:
```
[seed] Usuário 'admin' criado com sucesso.
Seed concluído com sucesso.
```

### 4. Acesse o sistema

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3001 |
| API | http://localhost:3000 |
| Health check | http://localhost:3000/health |

---

## Autenticação

O SGFP usa autenticação por JWT. Não há registro público — o usuário admin é criado via seed.

### Fluxo

1. `POST /auth/login` com `{ username, password }` → retorna `{ token, expiresIn }`
2. O token é armazenado em `localStorage` e cookie (`sig_token`, 8h)
3. O cliente Axios injeta `Authorization: Bearer <token>` em toda requisição
4. Em resposta `401`, o interceptor remove o token e redireciona para `/login`
5. O middleware Next.js protege rotas por navegação SSR (bots/crawlers)

### Testar login via PowerShell

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/login" `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"SuaSenhaForte123"}'
```

### Testar login via curl (Linux / macOS)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"SuaSenhaForte123"}'
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
| `INITIAL_ADMIN_PASSWORD` | api (seed) | ✅ | Senha do admin — **obrigatória para o seed funcionar** |
| `CORS_ORIGIN` | api | ✅ | Origem do browser (ex: `http://localhost:3001`) |
| `BRAPI_TOKEN` | api | ✅ | Token BRAPI para cotações |
| `NEXT_PUBLIC_API_URL` | web (build) | ✅ | URL da API usada pelo browser — embutida no build |
| `INTERNAL_API_URL` | web (SSR) | ✅ | URL da API usada pelo servidor Next.js |

---

## Estratégia de Cotações — Brapi + Yahoo Finance

Todas as buscas de cotação passam por `src/providers/yahoo/quote.provider.ts`, que implementa uma estratégia em dois estágios:

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

**Por que Brapi como primário:**
- A Brapi conhece tickers B3 nativamente (`PETR4`, `MXRF11`, `BOVA11`) — sem necessidade de sufixo `.SA`
- Resposta consistente para ações, FIIs, ETFs e BDRs listados na B3
- Mesma fonte já usada para importação de preços e taxas macro (CDI/SELIC/IPCA)

**Por que Yahoo como fallback:**
- Cobre ativos internacionais (`AAPL`, `MSFT`) que a Brapi não indexa
- Cobre casos excepcionais de tickers B3 obscuros que a Brapi eventualmente não retorna

**Retrocompatibilidade:** `fetchYahooQuote` é mantido como alias de `fetchQuote` no `quote.provider.ts` — nenhum módulo existente precisou ser alterado além do `assets.controller.ts` (import atualizado).

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
| Health | `/health` | Status da API |

Todos os endpoints (exceto `/auth/*` e `/health`) exigem:
```
Authorization: Bearer <token>
```

### Endpoints críticos da Dashboard

| Endpoint | Método | Descrição |
|---|---|---|
| `/portfolio-snapshots` | GET | Snapshots do portfólio (params: `period`, `limit`, `orderBy`, `order`) |
| `/allocation/calculate` | POST | Calcula alocação atual por classe |
| `/performance/summary` | GET | Rentabilidade geral da carteira |
| `/dividends/summary` | GET | Resumo total de proventos recebidos |

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

Caso o gráfico de evolução da dashboard apareça vazio, é necessário popular os snapshots DAILY históricos:

```powershell
$headers = @{ Authorization = "Bearer SEU_TOKEN_AQUI" }

$today = Get-Date
for ($i = 90; $i -ge 0; $i--) {
    $date = $today.AddDays(-$i).ToString("yyyy-MM-dd")
    try {
        Invoke-RestMethod -Method Post `
          -Uri "http://localhost:3000/portfolio-snapshots/generate" `
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

> ℹ️ Datas sem preço de mercado disponível (fins de semana / feriados) retornarão `SKIP` — comportamento esperado.

---

## Banco de Dados

### Comandos essenciais

```bash
# Gerar nova migração após alterar schema.prisma
npx prisma migrate dev --name descricao-da-mudanca

# Aplicar migrações (produção / Docker)
npx prisma migrate deploy

# Abrir Prisma Studio (interface visual)
npx prisma studio

# Regenerar o Prisma Client
npx prisma generate
```

### Models principais

| Model | Descrição |
|---|---|
| `User` | Usuário do sistema (criado via seed) |
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
| React Query | `@tanstack/react-query` — cache e refetch automático |
| Recharts | Gráficos (AreaChart, PieChart) |
| React Hook Form | Validação de formulários |
| Zod | Schema de validação |
| Axios | Cliente HTTP com interceptors |
| Lucide React | Ícones |
| date-fns | Formatação de datas com locale pt-BR |

### Design System

O frontend usa um design system próprio definido em `web/app/globals.css`:

- **Paleta**: dark moderno inspirado em Linear/Vercel — superfícies Zinc com hierarquia clara
- **Primário**: Azul-índigo (`#6366f1` / indigo-500)
- **Tipografia**: Geist (display e body)
- **Tokens CSS**: superfícies, texto, semânticas (success/warning/error), espaçamentos, raios e sombras
- **Utilitários financeiros**: `.positive`, `.negative`, `.neutral`, `.tabular-nums`

> ⚠️ Tokens `--color-surface-3`, `--color-primary-active` e `--color-error-muted` estão referenciados no código mas ainda não definidos em `globals.css`. Pendente de correção.

### Hooks de dados

| Hook | Arquivo | Endpoints chamados |
|---|---|---|
| `useSnapshots(limit)` | `useDashboard.ts` | `GET /portfolio-snapshots` |
| `useAllocation()` | `useDashboard.ts` | `POST /allocation/calculate` |
| `usePerformance()` | `useDashboard.ts` | `GET /performance/summary` |
| `useDividends()` | `useDashboard.ts` | `GET /dividends/summary` |
| `usePortfolioItems()` | `usePortfolio.ts` | `GET /portfolio-items` |
| `useSnapshots(period)` | `usePortfolio.ts` | `GET /portfolio-snapshots` |
| `useAllocation()` | `usePortfolio.ts` | `POST /allocation/calculate` |
| `usePerformance()` | `usePortfolio.ts` | `GET /performance/summary` |

> ⚠️ Os hooks `useAllocation` e `usePerformance` existem em **dois arquivos** (`useDashboard.ts` e `usePortfolio.ts`). Eles usam `queryKey`s diferentes (`allocation` vs. `portfolio-allocation`) para evitar colisão de cache no React Query.

### Rotas

| Rota | Status | Descrição |
|---|---|---|
| `/login` | ✅ Implementado | Tela de login com validação |
| `/` | ✅ Implementado | Dashboard — KPIs, gráfico de evolução e gráfico de alocação |
| `/portfolio` | 🔲 Planejado | Posições, P&L, preço médio por ativo |
| `/treasury` | 🔲 Planejado | Tesouro Direto — títulos, P&L líquido |
| `/fixed-income` | 🔲 Planejado | Renda Fixa — accrual, isenção, status de vencimento |
| `/transactions` | 🔲 Planejado | Histórico de transações |
| `/allocation` | 🔲 Planejado | Alocação por classe vs. meta (gráfico) |

---

## Problemas Resolvidos

Registro dos principais problemas encontrados e solucionados durante o desenvolvimento.

### Login sem usuário no banco

**Sintoma:** Ao tentar logar, a API retornava erro como se não existissem credenciais cadastradas.

**Causa:** O `seed.ts` depende da variável `INITIAL_ADMIN_PASSWORD` para criar o usuário admin. Essa variável não estava sendo passada para dentro do container porque o `docker-compose.yml` usava `APP_USERNAME`/`APP_PASSWORD` (nomenclatura antiga) em vez de `INITIAL_ADMIN_USERNAME`/`INITIAL_ADMIN_PASSWORD`.

**Solução:**
1. Atualizar o `docker-compose.yml` para usar as variáveis corretas
2. Adicionar `INITIAL_ADMIN_USERNAME` e `INITIAL_ADMIN_PASSWORD` no `.env` local
3. Recriar o container com `docker compose up -d --force-recreate api`
4. Rodar o seed novamente

### Migrations não aplicadas no container

**Sintoma:** A API subia mas falhava ao iniciar porque as tabelas não existiam no banco.

**Causa:** O `Dockerfile` não copiava a pasta `prisma/migrations` para o estágio `runner`, então `prisma migrate deploy` não encontrava as migrations em produção.

**Solução:** Adicionar `COPY --from=builder /app/prisma ./prisma` no estágio `runner` do Dockerfile.

### Erro de CORS no login pelo browser

**Sintoma:** O login funcionava via `Invoke-RestMethod` / `curl`, mas no browser aparecia o erro:
```
Access to XMLHttpRequest at 'http://localhost:3000/auth/login' from origin 'http://localhost:3001'
has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value
'http://web:3001' that is not equal to the supplied origin.
```

**Causa:** O `CORS_ORIGIN` estava configurado como `http://web:3001` (endereço interno da rede Docker). O browser envia `Origin: http://localhost:3001`, que é diferente do valor esperado pela API.

**Solução:** Alterar `CORS_ORIGIN` no `.env` para `http://localhost:3001` (a origem que o browser realmente envia) e recriar o container da API.

> ℹ️ `http://web:3001` é válido para comunicação container-a-container (SSR do Next.js). Para requisições do browser, use `http://localhost:3001`.

### baseURL do Axios apontando para porta errada

**Sintoma:** Todos os endpoints da dashboard (allocation, performance, dividends, snapshots) retornavam erro. As requisições chegavam ao próprio Next.js em vez da API NestJS.

**Causa:** O valor default de `API_URL` em `web/lib/api.ts` estava como `http://localhost:3000` — a porta do Next.js. A API NestJS fica na porta `3001` localmente. Sem a variável `NEXT_PUBLIC_API_URL` definida no `.env`, o Axios apontava para o lugar errado.

**Solução:** Corrigir o fallback em `api.ts` e o `.env.example`:
```ts
// antes
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
// depois
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
```

### queryKeys conflitantes entre useDashboard e usePortfolio

**Sintoma:** Navegar entre a dashboard e a página de portfólio causava dados incorretos sendo exibidos (cache cruzado entre hooks).

**Causa:** `useAllocation()` e `usePerformance()` em `usePortfolio.ts` usavam as mesmas `queryKey`s (`['allocation']`, `['performance']`) que os hooks equivalentes em `useDashboard.ts`. Além disso, `useAllocation` em `usePortfolio.ts` chamava `GET /allocation` (inexistente) em vez de `POST /allocation/calculate`, e `usePerformance` chamava `GET /performance` em vez de `GET /performance/summary`.

**Solução:**
- `useAllocation` em `usePortfolio.ts`: endpoint `GET /allocation` → `POST /allocation/calculate`; queryKey `['allocation']` → `['portfolio-allocation']`
- `usePerformance` em `usePortfolio.ts`: endpoint `GET /performance` → `GET /performance/summary`; queryKey `['performance']` → `['portfolio-performance']`

### Gráficos da dashboard em empty state (snapshots DAILY fora do intervalo)

**Sintoma:** O gráfico de evolução do patrimônio (90 dias) aparecia vazio mesmo com dados no banco.

**Causa:** Os snapshots `DAILY` existentes foram gerados pelo seed com dados históricos de 2024. O `useSnapshots(90)` busca os últimos 90 dias a partir de hoje, e nenhum snapshot caia nesse intervalo.

**Solução:** Executar o script PowerShell de geração retroativa (ver seção *Jobs Automáticos → Gerar snapshots DAILY retroativos*) para popular os últimos 90 dias com dados reais da carteira atual.

### Cotações exigindo sufixo `.SA` desnecessariamente

**Sintoma:** Ao cadastrar um ativo B3 (ex: `PETR4`), o sistema buscava `PETR4.SA` no Yahoo Finance — um sufixo que não existe na realidade e confundia o fluxo de cadastro.

**Causa:** O `yahoo.client.ts` era a única fonte de cotações e o Yahoo Finance exige o sufixo `.SA` para tickers da B3. Isso tornava o ticker exibido ao usuário inconsistente com o ticker real da bolsa.

**Solução:** Criação de `src/providers/yahoo/quote.provider.ts` com estratégia em dois estágios: **Brapi como primário** (conhece tickers B3 nativamente, sem `.SA`) e **Yahoo Finance como fallback** (para ativos internacionais e casos excepcionais). O Yahoo ainda tenta `.SA` internamente como segunda tentativa, mas isso é transparente para o usuário.

### SyntaxError no SWC — mistura de `||` com `??` sem parênteses

**Sintoma:** Build do Docker falhava com:
```
Error: Nullish coalescing operator(??) requires parens when mixing with logical operators
./components/transactions/NewTransactionDrawer.tsx
```

**Causa:** O SWC (compilador do Next.js 15) rejeita expressões que misturam `||` e `??` na mesma linha sem parênteses explícitos — regra de precedência de operadores herdada da especificação ECMAScript.

```ts
// ❌ inválido para o SWC
const resolvedClassName = inferredClassName ||
  (assetClasses.data ?? []).find(...)?.name ?? ''
```

**Solução:** Extrair a subexpressão com `??` para uma variável separada, eliminando a mistura:
```ts
// ✅ correto
const fallbackClassName = (assetClasses.data ?? []).find(
  (c: AssetClass) => c.id === fallbackClassId,
)?.name ?? ''
const resolvedClassName = inferredClassName || fallbackClassName
```

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

---

## Roadmap

### ✅ Concluído — API

- [x] CRUD completo de ativos, classes, transações, proventos e contas
- [x] Importação de preços via BRAPI e Yahoo Finance
- [x] Snapshots DAILY / WEEKLY / MONTHLY com geração retroativa
- [x] Cron de importação de preços B3 + Yahoo Finance (5x/dia)
- [x] Cron de importação de proventos semanal (Yahoo Finance)
- [x] Endpoints de alocação, performance e dividendos
- [x] Módulo Tesouro Direto — cadastro, P&L (WAVG), IR/IOF, cron radaropcoes, resgate parcial/total
- [x] Módulo Renda Fixa Privada — accrual por indexador, IR/IOF, isenção automática, resgate com P&L
- [x] Cron de accrual de Renda Fixa (diário, taxas reais via BRAPI)
- [x] Autenticação JWT com usuário criado via seed
- [x] **`quote.provider.ts`** — estratégia Brapi primário / Yahoo Finance fallback (sem `.SA` obrigatório)

### ✅ Concluído — Frontend

- [x] Estrutura Next.js 15 (App Router) com Tailwind CSS v4
- [x] Design system próprio — tokens CSS, paleta dark, tipografia Geist
- [x] Tela de login com validação (zod + react-hook-form)
- [x] Layout do dashboard com sidebar responsiva (desktop + drawer mobile)
- [x] Cliente Axios com interceptors JWT e redirect em 401
- [x] Middleware Next.js para proteção de rotas
- [x] **Dashboard — página principal** com KPIs reais, gráfico de evolução do patrimônio (90 dias) e gráfico de alocação por classe, skeleton loaders e estados de erro/empty
- [x] Hooks de dados com React Query (`useDashboard`, `usePortfolio`, `useTreasury`, `useFixedIncome`)
- [x] **`NewTransactionDrawer`** — wizard 4 passos (tipo → ativo → detalhes → confirmar) com busca via Brapi/Yahoo, inferência de classe, cadastro automático de novo ativo
- [x] **Correção da baseURL do Axios** — fallback de `3000` → `3001` (`web/lib/api.ts`)
- [x] **Correção dos endpoints em `usePortfolio.ts`** — `/allocation` → `POST /allocation/calculate`; `/performance` → `GET /performance/summary`
- [x] **Correção de queryKeys** em `usePortfolio.ts` para evitar colisão de cache com `useDashboard.ts`
- [x] **Fix SWC build** — extração de variável em `NewTransactionDrawer.tsx` para resolver erro de precedência `||` vs `??`

### 🔴 Alta Prioridade — Em andamento

- [ ] **Renomear projeto de SIG para SGFP** — ver checklist abaixo
- [ ] **Corrigir tokens CSS inconsistentes** — `--color-surface-3`, `--color-primary-active`, `--color-error-muted` referenciados no código mas não definidos em `globals.css`
- [ ] **Tesouro Direto — import histórico via CSV** (Tesouro Transparente)

### 🟡 Média Prioridade

- [ ] Página `/portfolio` — posições, P&L, preço médio, % da carteira
- [ ] Página `/treasury` — tabela de títulos com P&L líquido
- [ ] Página `/fixed-income` — accrual, isenção, status de vencimento
- [ ] Página `/transactions` — histórico com filtros
- [ ] Página `/allocation` — gráfico pizza interativo
- [ ] IRR / XIRR — retorno real considerando timing de aportes
- [ ] Benchmark — comparar carteira vs. CDI, IBOV e IPCA
- [ ] Dark/light mode toggle no frontend
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

## Checklist de Renomeação — SIG → SGFP

Arquivos e trechos que ainda precisam ser atualizados para refletir o novo nome **SGFP — Sistema de Gestão de Finanças Pessoais**:

### Identidade visual (frontend)
- [ ] `web/app/(auth)/login/page.tsx` — texto "Sistema de Investimentos" e sigla "SIG"
- [ ] `web/app/(dashboard)/layout.tsx` — logo e texto "SIG / Investimentos" na sidebar e header mobile
- [ ] `web/app/layout.tsx` — metadata `title` e `description` da aplicação
- [ ] `web/app/globals.css` — comentário do design system ainda referencia nome antigo
- [ ] `web/middleware.ts` — cookie nomeado `sig_token` → `sgfp_token`
- [ ] `web/lib/auth.ts` — constante `TOKEN_KEY = 'sig_token'` → `'sgfp_token'`

### Docker e infraestrutura
- [ ] `docker-compose.yml` — `name: sig` → `name: sgfp`
- [ ] `docker-compose.yml` — `DOCKER_NETWORK_NAME` → `sgfp_network`
- [ ] `.env` / `.env.example` — variáveis e comentários com "SIG"

### API
- [ ] `package.json` — `"name": "sig-api"` → `"sgfp-api"`
- [ ] `web/package.json` — `"name": "sig-web"` → `"sgfp-web"`

### Banco de dados
- [ ] Variável `POSTGRES_DB` — `sig_db` → `sgfp_db` (requer recriar volume ou migração manual)

> ⚠️ Renomear o banco (`POSTGRES_DB`) apaga os dados do volume atual se não for feita uma migração/dump antes. Faça backup com `docker compose exec db pg_dump -U $APP_DB_USER $POSTGRES_DB > backup.sql` antes de alterar.

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

---

*SGFP v0.3.1 — uso pessoal*
