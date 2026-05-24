# Sistema de Investimentos — API

API REST para gestão e acompanhamento de portfólio de investimentos. Construída com Node.js, Express, TypeScript, Prisma e PostgreSQL.

***

## Stack

| Camada | Tecnologia |
|--------|------------|
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Linguagem | TypeScript 5 |
| ORM | Prisma 6 |
| Banco de dados | PostgreSQL 15 |
| Autenticação | JWT (Bearer) |
| Containerização | Docker + Docker Compose |
| CI/CD | GitHub Actions (CodeQL + Dependabot) |

***

## Módulos

| Módulo | Descrição |
|--------|-----------|
| `auth` | Registro, login e refresh de token JWT |
| `asset-classes` | Classes de ativos com alocação-alvo |
| `assets` | Cadastro de ativos (ações, FIIs, renda fixa, etc.) |
| `transactions` | Compras, vendas, bonificações e desdobramentos |
| `price-history` | Histórico de preços de fechamento |
| `income-events` | Dividendos, JCP e rendimentos |
| `portfolio-items` | Posição atual calculada por ativo |
| `portfolio-snapshots` | Snapshots periódicos do portfólio (DAILY / WEEKLY) |
| `allocation` | Alocação atual vs. alvo por classe |
| `performance` | Retorno, volatilidade e métricas de desempenho |
| `dividends` | Consolidação de proventos recebidos |

***

## Portfolio Snapshots

Snapshots capturam o estado completo do portfólio em uma data de referência. Suportam dois períodos:

- **DAILY** — um snapshot por dia útil (seg–sex), gerado automaticamente às 18:30 BRT
- **WEEKLY** — um snapshot por semana (sexta-feira), gerado automaticamente às 18:00 BRT

### Endpoints

```
POST /portfolio-snapshots/generate
POST /portfolio-snapshots/generate-range
GET  /portfolio-snapshots
GET  /portfolio-snapshots/:date
```

### Geração de um snapshot único

```http
POST /portfolio-snapshots/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "referenceDate": "2026-05-23",
  "period": "DAILY"
}
```

### Backfill de um intervalo

```http
POST /portfolio-snapshots/generate-range
Content-Type: application/json
Authorization: Bearer <token>

{
  "startDate": "2024-01-15",
  "endDate":   "2026-05-23",
  "period":    "DAILY"
}
```

Resposta:
```json
{
  "generated": 590,
  "errors": [],
  "snapshots": [...]
}
```

> **Nota:** Para `DAILY`, dias sem preços disponíveis (feriados e fins de semana) são pulados silenciosamente.

### Crons automáticos

Os jobs são registrados no startup da aplicação via `node-cron`:

| Job | Schedule (UTC) | Horário BRT |
|-----|---------------|-------------|
| WEEKLY | `0 21 * * 5` | Sexta-feira 18:00 |
| DAILY | `30 21 * * 1-5` | Seg–Sex 18:30 |

***

## Configuração

### Pré-requisitos

- Docker e Docker Compose
- Node.js 22+ (desenvolvimento local)

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://user:password@db:5432/investimentos
JWT_SECRET=sua_chave_secreta
JWT_REFRESH_SECRET=sua_chave_refresh
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

### Subir com Docker

```bash
docker compose up -d
```

A API ficará disponível em `http://localhost:3000`.

### Desenvolvimento local

```bash
npm install
npx prisma migrate deploy
npm run dev
```

***

## Migrations

O projeto usa Prisma Migrate para versionamento do schema. As migrations ficam em `prisma/migrations/`.

```bash
# Aplicar migrations pendentes
npx prisma migrate deploy

# Criar nova migration
npx prisma migrate dev --name descricao_da_mudanca
```

### Histórico de migrations

| Migration | Data |
|-----------|------|
| `20260517022440_init` | 2026-05-17 |
| `20260518004626_adjust_asset_class_structure` | 2026-05-18 |
| `20260519003806_add_transaction_status_and_refine_transaction_type` | 2026-05-19 |
| `20260519124438_make_transaction_account_optional` | 2026-05-19 |
| `20260520213443_add_income_event_fields` | 2026-05-20 |
| `20260521_portfolio_item_account_optional` | 2026-05-21 |

***

## CI/CD

- **CodeQL** — análise estática de segurança a cada push/PR
- **Dependabot** — atualizações automáticas de dependências npm e GitHub Actions

***

## Próximos Passos

### Alta prioridade

- [ ] **Importação automática de preços** — integração com API de cotações (ex: Yahoo Finance, BRAPI) para popular `PriceHistory` automaticamente via cron diário
- [ ] **Importação de proventos** — busca automática de dividendos e JCP declarados para os ativos da carteira
- [ ] **Frontend — gráfico de evolução diária** — consumir os snapshots DAILY para exibir curva de patrimônio e rentabilidade no dashboard

### Média prioridade

- [ ] **Cálculo de IRR / XIRR** — retorno interno da carteira considerando aportes e retiradas ao longo do tempo
- [ ] **Benchmark comparison** — comparar rentabilidade do portfólio contra CDI, IBOV e IPCA
- [ ] **Relatório mensal PDF** — exportar extrato consolidado com posição, proventos e rentabilidade do mês
- [ ] **Alertas de rebalanceamento** — notificar quando a alocação atual desviar mais de X% da alocação-alvo

### Baixa prioridade / Melhorias

- [ ] **Testes automatizados** — cobertura de unit tests nos services e integration tests nos endpoints críticos
- [ ] **Rate limiting** — proteção nos endpoints públicos e de geração de snapshots
- [ ] **Paginação nos listSnapshots** — cursor-based pagination para carteiras com histórico longo
- [ ] **Suporte a múltiplas contas/corretoras** — segregar posições por conta dentro do mesmo portfólio

***

## Estrutura do Projeto

```
src/
├── core/
│   └── prisma/          # Cliente Prisma singleton
├── jobs/
│   └── snapshot.cron.ts # Crons DAILY e WEEKLY
├── modules/
│   ├── auth/
│   ├── asset-classes/
│   ├── assets/
│   ├── transactions/
│   ├── price-history/
│   ├── income-events/
│   ├── portfolio-items/
│   ├── portfolio-snapshots/
│   ├── allocation/
│   ├── performance/
│   └── dividends/
└── shared/
    └── middleware/      # authenticate, errorHandler
```

***

## Licença

Uso privado.