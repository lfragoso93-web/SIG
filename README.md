# SIG — Sistema de Investimentos e Gestão

API REST para controle e acompanhamento de carteiras de investimentos. Permite cadastrar ativos, registrar transações, importar histórico de preços e proventos, calcular snapshots do portfólio e medir performance.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 + TypeScript |
| Framework | Express 4 |
| ORM | Prisma 6 |
| Banco de dados | PostgreSQL 16 |
| Agendamento | node-cron |
| Cotações | BRAPI (B3) + Yahoo Finance (internacionais) |
| Containerização | Docker Compose |
| Autenticação | JWT (Bearer token) |

---

## Estrutura do Projeto

```
src/
├── index.ts                        # Entry point — Express + crons
├── core/
│   └── prisma/prisma.service.ts    # Instância singleton do PrismaClient
├── jobs/
│   ├── snapshot.cron.ts            # Cron de snapshots diário/semanal/mensal
│   ├── price-import.cron.ts        # Cron de importação de preços (5x/dia)
│   └── income-import.cron.ts       # Cron de importação de proventos (semanal)
├── modules/
│   ├── auth/                       # Login e geração de JWT
│   ├── asset-classes/              # Classes de ativos (Ação, FII, ETF…)
│   ├── assets/                     # Cadastro de ativos
│   ├── transactions/               # Compras e vendas
│   ├── price-history/              # Histórico de preços + importação BRAPI
│   ├── income-events/              # Proventos (dividendos, JCP, rendimentos)
│   ├── portfolio-items/            # Posição consolidada por ativo
│   ├── portfolio-snapshots/        # Snapshots DAILY / WEEKLY / MONTHLY
│   ├── allocation/                 # Distribuição da carteira por classe
│   ├── performance/                # Performance e rentabilidade
│   └── dividends/                  # Resumo de proventos recebidos
├── providers/
│   └── brapi/brapi.client.ts       # BRAPI + Yahoo Finance (histórico, cotação, dividendos)
└── shared/
    ├── constants/                  # Constantes globais
    ├── errors/                     # Classes de erro customizadas
    ├── middleware/                 # authenticate, errorHandler
    └── utils/                      # Utilitários compartilhados
prisma/
├── schema.prisma                   # Schema do banco de dados
└── migrations/                     # Migrações geradas pelo Prisma
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

# BRAPI
BRAPI_TOKEN="seu-token-brapi"
BRAPI_BASE_URL="https://brapi.dev/api"   # opcional

# Servidor
PORT=3001
CORS_ORIGIN="http://localhost:5173"
```

> ⚠️ Sem `CORS_ORIGIN` definido, a API aceita qualquer origem (`*`). Sempre defina em produção.

---

## Instalação e Execução

### Com Docker (recomendado)

```bash
# Subir banco + API
docker compose up -d

# Rodar migrações
docker compose exec api npx prisma migrate deploy

# Acompanhar logs
docker compose logs -f api
```

### Local

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
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login — retorna JWT |

### Ativos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/assets` | Listar ativos |
| POST | `/assets` | Criar ativo |
| GET | `/assets/:id` | Detalhe do ativo |
| PUT | `/assets/:id` | Atualizar ativo |
| DELETE | `/assets/:id` | Remover ativo |

### Classes de Ativos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/asset-classes` | Listar classes |
| POST | `/asset-classes` | Criar classe |
| PUT | `/asset-classes/:id` | Atualizar classe |
| DELETE | `/asset-classes/:id` | Remover classe |

### Transações
| Método | Rota | Descrição |
|---|---|---|
| GET | `/transactions` | Listar transações |
| POST | `/transactions` | Registrar transação |
| GET | `/transactions/:id` | Detalhe |
| PUT | `/transactions/:id` | Atualizar |
| DELETE | `/transactions/:id` | Remover |

### Histórico de Preços
| Método | Rota | Descrição |
|---|---|---|
| GET | `/price-history` | Listar registros |
| GET | `/price-history/:assetId` | Por ativo |
| POST | `/price-history/import/:ticker` | Importar histórico via BRAPI |

**Body da importação:**
```json
{
  "interval": "1d",
  "range": "1y"
}
```
Ou por datas:
```json
{
  "interval": "1d",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

### Eventos de Renda (Proventos)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/income-events` | Listar proventos |
| POST | `/income-events` | Registrar provento |
| PUT | `/income-events/:id` | Atualizar |
| DELETE | `/income-events/:id` | Remover |
| POST | `/income-events/import/:ticker` | Importar proventos de um ativo |
| POST | `/income-events/import/batch` | Importar proventos de todos os ativos |

### Itens do Portfólio
| Método | Rota | Descrição |
|---|---|---|
| GET | `/portfolio-items` | Posição consolidada de todos os ativos |
| GET | `/portfolio-items/:assetId` | Posição de um ativo |

### Snapshots do Portfólio
| Método | Rota | Descrição |
|---|---|---|
| GET | `/portfolio-snapshots` | Listar snapshots |
| GET | `/portfolio-snapshots/:id` | Detalhe do snapshot |
| POST | `/portfolio-snapshots/generate` | Gerar snapshot manual |
| POST | `/portfolio-snapshots/generate-range` | Gerar snapshots em range |

**Body do generate-range:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-05-23",
  "period": "DAILY"
}
```
`period`: `DAILY` | `WEEKLY` | `MONTHLY`

### Alocação
| Método | Rota | Descrição |
|---|---|---|
| GET | `/allocation` | Distribuição da carteira por classe de ativo |

### Performance
| Método | Rota | Descrição |
|---|---|---|
| GET | `/performance` | Rentabilidade da carteira |

### Dividendos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/dividends` | Resumo de proventos recebidos |

### Health
| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status da API |

---

## Jobs Automáticos (Crons)

### Importação de Preços — `price-import.cron.ts`

Roda **5x por dia, segunda a sexta**, em horário de pregão B3:

| Horário BRT | Horário UTC | Cron |
|---|---|---|
| 10:00 | 13:00 | `0 13 * * 1-5` |
| 11:30 | 14:30 | `30 14 * * 1-5` |
| 13:00 | 16:00 | `0 16 * * 1-5` |
| 15:00 | 18:00 | `0 18 * * 1-5` |
| 17:30 | 20:30 | `30 20 * * 1-5` |

- **Ativos BRL** → BRAPI (batch com fallback individual)
- **Ativos não-BRL** → Yahoo Finance (individual)
- Faz `upsert` em `PriceHistory` para a data de hoje

**Executar manualmente:**
```bash
docker compose exec api node -e "
const { importCurrentPrices } = require('./dist/jobs/price-import.cron');
importCurrentPrices().then(r => console.log(JSON.stringify(r, null, 2)));
"
```

### Importação de Proventos — `income-import.cron.ts`

Roda **1x por semana**, domingo às 06:00 BRT (09:00 UTC):

| Horário BRT | Horário UTC | Cron |
|---|---|---|
| Dom 06:00 | Dom 09:00 | `0 9 * * 0` |

- Importa dividendos, JCP e rendimentos de todos os ativos ativos via Yahoo Finance
- Usa `skipDuplicates` — seguro para rodar múltiplas vezes sem duplicar registros

**Executar manualmente:**
```bash
docker compose exec api node -e "
const { importAllIncomeEvents } = require('./dist/jobs/income-import.cron');
importAllIncomeEvents().then(r => console.log(JSON.stringify(r, null, 2)));
"
```

### Snapshots do Portfólio — `snapshot.cron.ts`

| Frequência | Horário BRT | Descrição |
|---|---|---|
| Diário | 23:00 (seg–sex) | Snapshot `DAILY` |
| Semanal | Sex 23:30 | Snapshot `WEEKLY` |
| Mensal | Último dia do mês 23:59 | Snapshot `MONTHLY` |

---

## Provedores de Dados

### BRAPI (`brapi.client.ts`)

| Método | Descrição |
|---|---|
| `getHistoricalPrices(params)` | Histórico OHLCV de um ticker |
| `getCurrentPrices(tickers[])` | Cotação atual em batch (fallback individual) |
| `getYahooCurrentPrice(ticker)` | Cotação atual via Yahoo Finance |
| `getDividends(ticker)` | Dividendos históricos via Yahoo Finance |

---

## Banco de Dados

```bash
# Gerar nova migração após alterar schema.prisma
npx prisma migrate dev --name descricao-da-mudanca

# Aplicar migrações em produção
npx prisma migrate deploy

# Abrir Prisma Studio
npx prisma studio
```

---

## Roadmap

### ✅ Concluído
- [x] CRUD completo de ativos, classes, transações, proventos
- [x] Importação de histórico de preços via BRAPI
- [x] Snapshots DAILY / WEEKLY / MONTHLY com geração em range
- [x] Cron de importação de preços (5x/dia — BRAPI + Yahoo Finance)
- [x] Cron de importação de proventos (semanal — Yahoo Finance)
- [x] Endpoints de alocação, performance e dividendos

### 🔴 Alta Prioridade
- [ ] **Frontend — dashboard principal** — gráfico de evolução do patrimônio consumindo os snapshots DAILY, cards de KPIs (patrimônio atual, rentabilidade, proventos recebidos), tabela de posição por ativo
- [ ] **Renda fixa — Tesouro Direto** — modelagem e importação de títulos públicos (Tesouro Selic, IPCA+, Prefixado): cadastro com taxa de emissão, indexador, vencimento e cálculo de marcação a mercado diária
- [ ] **Renda fixa — CDB / LCI / LCA / LIG / CRI / CRA / Debêntures** — suporte a títulos com rentabilidade % CDI, IPCA+ e prefixada; cálculo de valor bruto, IR regressivo e IOF, e valor líquido na data

### 🟡 Média Prioridade
- [ ] **IRR/XIRR** — retorno real da carteira considerando timing e valor dos aportes
- [ ] **Benchmark** — comparar rentabilidade vs. CDI, IBOV e IPCA (série histórica diária)
- [ ] **Importação via corretora** — leitura de notas de corretagem (PDF/XLSX) para cadastro automático de transações
- [ ] **Alertas de preço** — notificação quando ativo atingir preço alvo (e-mail ou webhook)
- [ ] **Testes automatizados** — cobertura mínima nos services críticos (snapshots, portfolio-items, price-import)

### 🟢 Baixa Prioridade
- [ ] **Multi-carteira** — suporte a múltiplas carteiras por usuário (ex: carteira pessoal, PGBL, carteira do cônjuge)
- [ ] **Proventos previstos** — calendário de dividendos futuros com base em histórico e anúncios
- [ ] **Rate limiting** — proteção por IP nos endpoints públicos
- [ ] **Logs estruturados** — substituir `console.log` por Winston/Pino com níveis e saída JSON
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
