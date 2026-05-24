# SIG — Sistema de Investimentos e Gestão

API REST para controle e acompanhamento de carteiras de investimentos. Permite cadastrar ativos, registrar transações, importar histórico de preços e proventos, calcular snapshots do portfólio e medir performance.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 + TypeScript |
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
│   └── price-import.cron.ts        # Cron de importação de preços (5x/dia)
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

- **Ativos BRL** → BRAPI (batch, até 50 tickers por chamada)
- **Ativos não-BRL** → Yahoo Finance (individual)
- Faz `upsert` em `PriceHistory` para a data de hoje

**Executar manualmente:**
```bash
docker compose exec api node -e "
const { importCurrentPrices } = require('./dist/jobs/price-import.cron');
importCurrentPrices().then(r => console.log(JSON.stringify(r, null, 2)));
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
| `getCurrentPrices(tickers[])` | Cotação atual em batch (até 50 tickers) |
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

## Próximos Passos

### Alta Prioridade
- [ ] **Importação automática de proventos** — cron semanal para buscar dividendos/JCP declarados dos ativos da carteira
- [ ] **Frontend — gráfico de evolução** — consumir `GET /portfolio-snapshots` para renderizar curva de patrimônio (590+ snapshots DAILY disponíveis)
- [ ] **Corrigir warning `CORS_ORIGIN`** — garantir que a variável está definida no `.env` de produção

### Média Prioridade
- [ ] **IRR/XIRR** — retorno real da carteira considerando timing dos aportes
- [ ] **Benchmark** — comparar rentabilidade vs. CDI, IBOV e IPCA
- [ ] **Testes automatizados** — cobertura mínima nos services críticos (snapshots, portfolio-items, price-import)

### Baixa Prioridade
- [ ] **Rate limiting** — proteção por IP nos endpoints públicos
- [ ] **Logs estruturados** — substituir `console.log` por Winston/Pino
- [ ] **CI/CD** — pipeline GitHub Actions para lint + build + testes

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
