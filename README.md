# SIG — Sistema de Gestão de Investimentos

Projeto pessoal em evolução para um sistema modular de gestão de carteira de investimentos, com visão de longo prazo para expansão em gestão financeira pessoal. A direção arquitetural mais adequada para o estágio atual é um **monólito modular**: um único sistema por enquanto, mas organizado por domínios de negócio claros, reduzindo complexidade operacional e facilitando crescimento futuro.

## Visão do produto

O objetivo atual do SIG é consolidar a gestão de carteira de investimentos em um único sistema, cobrindo cadastro de ativos, transações, histórico de preços, eventos de renda, posição consolidada e snapshots da carteira. A visão futura é expandir a mesma base para um sistema mais amplo de finanças pessoais, aproveitando módulos compartilhados e evitando retrabalho estrutural.

## Stack atual

| Camada | Tecnologia | Papel no sistema |
|---|---|---|
| Backend | Node.js + Express + TypeScript | API, regras de negócio e organização modular |
| ORM | Prisma | Acesso ao banco e modelagem de dados |
| Banco | PostgreSQL | Persistência dos dados |
| Infra local | Docker Compose | Ambiente de desenvolvimento com API e banco |
| Validação | Zod | Validação de payloads e entradas |
| Integrações | Yahoo Finance | Preços históricos e eventos de proventos |
| Jobs | node-cron | Crons de snapshot WEEKLY e DAILY |
| Futuro frontend | Ainda em definição | Camada visual do produto |

## Arquitetura modular

A arquitetura do SIG é guiada por domínios, e não por telas isoladas ou por endpoints soltos. Há três camadas: a base do sistema (reutilizável por qualquer domínio), o domínio de investimentos (foco atual) e o domínio futuro de finanças pessoais.

### 1. Base do sistema

- `auth`: login, emissão e validação de token.
- `users`: usuários do sistema, perfis e preferências.
- `settings`: parâmetros globais do sistema.
- `institutions`: corretoras, bancos e instituições financeiras.
- `accounts`: contas de investimento e contas bancárias.
- `shared`: erros, middlewares, utilitários, constantes e helpers reutilizáveis.
- `core`: bootstrap do servidor, configuração e Prisma.

### 2. Domínio de investimentos

- `asset-classes`: classes de ativos.
- `assets`: cadastro e metadados dos ativos.
- `transactions`: compras, vendas e movimentações.
- `price-history`: histórico de preços via Yahoo Finance.
- `income-events`: dividendos, juros, rendimentos e proventos.
- `dividends`: sync automático de proventos via Yahoo Finance.
- `portfolio-items`: posição consolidada por ativo.
- `portfolio-snapshots`: snapshots semanais e diários da carteira por data.
- `jobs`: crons agendados (snapshot WEEKLY e DAILY).

### 3. Domínio futuro de finanças pessoais

- `categories`: categorias financeiras.
- `cash-transactions`: receitas, despesas e transferências.
- `budgets`: orçamento mensal.
- `recurring-payments`: lançamentos recorrentes.
- `cards`: cartões e faturas.
- `reports`: relatórios consolidados de vida financeira.
- `goals`: metas financeiras e planejamento.

## Estrutura de pastas

```text
src/
  core/
    prisma/
    config/
    server/
  shared/
    errors/
    middleware/
    utils/
    constants/
  providers/
    yahoo/              # cliente Yahoo Finance (preços históricos e proventos)
  jobs/
    snapshot.cron.ts   # crons WEEKLY e DAILY de snapshots
  modules/
    auth/
    users/
    settings/
    institutions/
    accounts/
    asset-classes/
    assets/
    transactions/
    price-history/
    income-events/
    dividends/
    portfolio-items/
    portfolio-snapshots/
    categories/           # futuro
    cash-transactions/    # futuro
    budgets/              # futuro
    reports/              # futuro
```

## Estado atual do sistema

O núcleo de investimentos está funcional. O backend responde corretamente, o ambiente Docker está estável, e os módulos principais do domínio de investimentos foram construídos e validados com dados reais.

### Módulos atuais

| Módulo | Status | Observação |
|---|---|---|
| `core` | ✅ Funcional | Bootstrap, Prisma e configuração estáveis |
| `shared` | ✅ Funcional | Erros, middlewares e utilitários padronizados |
| `auth` | 🔄 Em andamento | Rota de login existente; fluxo completo de usuário pendente |
| `institutions` | ✅ Funcional | CRUD implementado |
| `accounts` | ✅ Funcional | CRUD implementado, vinculado a institutions |
| `asset-classes` | ✅ Funcional | Base para classificação dos ativos |
| `assets` | ✅ Funcional | Cadastro, consulta e metadados implementados |
| `transactions` | ✅ Funcional | CRUD completo; dispara regeneração do snapshot WEEKLY da semana após create/update/delete |
| `price-history` | ✅ Funcional | Histórico de preços via Yahoo Finance; importação individual e em lote; usa `closePrice` (preço nominal) |
| `income-events` | ✅ Funcional | CRUD de proventos implementado |
| `dividends` | ✅ Funcional | Sync automático via Yahoo Finance: calcula `grossAmount = rate × qty` considerando a posição na data do pagamento |
| `portfolio-items` | ✅ Funcional | Posição consolidada por ativo calculada e persistida |
| `portfolio-snapshots` | ✅ Funcional | Snapshots WEEKLY (sextas-feiras) e DAILY (dias úteis); preço de fechamento por ativo; feriados sem preço são pulados automaticamente |
| `jobs` | ✅ Funcional | Cron WEEKLY: sextas 18h BRT; Cron DAILY: seg–sex 18h30 BRT; backfill disponível via `backfillDailySnapshots()` |
| `users` | 📋 Planejado | Ainda não implementado |
| `cash-transactions` | 📋 Planejado | Domínio futuro de finanças pessoais |
| `budgets` | 📋 Planejado | Domínio futuro de finanças pessoais |

### Decisões técnicas relevantes

- **Prisma Decimal**: campos `Decimal` do Prisma retornam instâncias de `Prisma.Decimal`, não `number`. Toda leitura numérica deve usar `.toNumber()` antes de qualquer operação aritmética.
- **Datas no banco**: campos `@db.Date` retornam objetos `Date` com hora `00:00:00.000Z`. Comparações com `lte`/`gte` no Prisma funcionam normalmente.
- **Sync de dividendos**: o cálculo de `grossAmount` considera apenas transações do tipo `BUY`/`SELL` com `tradeDate <= paymentDate`. Eventos anteriores à primeira compra ficam com `grossAmount = 0` (comportamento esperado).
- **Yahoo Finance — preços**: dados históricos buscados via `/v8/finance/chart` com `interval=1d`. O campo `closePrice` (preço nominal) é gravado e usado nos snapshots; `adjustedClose` é gravado no banco mas não é lido — decisão intencional para manter consistência entre preço de mercado e custo médio, ambos nominais.
- **Yahoo Finance — proventos**: dados buscados com `events=dividends`. A tolerância de match entre `paymentDate` do evento e a data retornada pelo Yahoo é de ±4 dias.
- **Snapshots DAILY e feriados**: o cron DAILY verifica se existe ao menos um `PriceHistory` com `priceDate` igual ao dia antes de gerar o snapshot. Se não houver (feriado ou dia sem pregão), retorna `null` e o cron pula silenciosamente.
- **Snapshot DAILY — ativo sem preço no dia**: ativos que não tiveram negociação em um dia específico usam `investedAmount` como `marketValue` (sem distorção para zero). Quando o preço chega no próximo pregão, o snapshot do dia correto usa o `closePrice` real.
- **Trigger pós-transação**: create/update/delete em `transactions` dispara `generateSnapshot(tradeDate, 'WEEKLY')` de forma assíncrona (fire-and-forget). Erros são logados mas não propagados para a resposta da API.
- **@types/express v5**: `req.query.*` retorna `string | string[] | ParsedQs` nessa versão. Sempre fazer cast explícito para `string | undefined` antes de usar como argumento tipado.
- **Splits e grupamentos**: o sistema **não detecta corporate actions automaticamente**. Desdobramentos e grupamentos devem ser registrados manualmente como transações do tipo `SPLIT` / `REVERSE_SPLIT`. Mudanças de ticker (ex: PETZ3 → AUAU3 após incorporação) também são tratadas manualmente via atualização direta no banco.
- **Ticker no Yahoo Finance**: ativos brasileiros são consultados com sufixo `.SA` (ex: `PETR4.SA`). O cliente Yahoo adiciona o sufixo automaticamente se ausente.

## Segurança e CI

O repositório conta com três camadas de segurança automatizadas:

| Ferramenta | Quando roda | O que verifica |
|---|---|---|
| **CodeQL** | Push/PR para `main` + toda segunda | Análise estática TypeScript (`security-extended`) |
| **npm audit** | Mudança em `package*.json` + toda segunda | Vulnerabilidades `moderate` ou acima nas dependências |
| **Dependabot** | Toda segunda | Abre PRs para atualizar npm, Docker e GitHub Actions |

Resultados do CodeQL aparecem em **Security → Code scanning alerts** no repositório. O Dependabot abre PRs com label `dependencies`/`security` e revisão atribuída ao mantenedor.

## Roadmap

### Fase 1 — Base técnica ✅ Concluída

- Estabilizar Docker e fluxo local.
- Consolidar tratamento de erros.
- Padronizar validações com Zod.
- Fechar o fluxo mínimo de autenticação.

### Fase 2 — Núcleo de investimentos ✅ Concluída

- Fechar `price-history` com Yahoo Finance. ✅
- Fechar `income-events`. ✅
- Implementar sync de dividendos (`dividends`). ✅
- Consolidar `portfolio-items`. ✅
- Consolidar `portfolio-snapshots`. ✅

### Fase 3 — Automação e qualidade ✅ Concluída

- Cron WEEKLY (sextas 18h BRT) e DAILY (seg–sex 18h30 BRT). ✅
- Trigger pós-transação para regenerar snapshot da semana. ✅
- Snapshot DAILY com skip automático de feriados. ✅
- CodeQL + npm audit + Dependabot no CI. ✅

### Fase 4 — Experiência do produto

- Definir e iniciar o frontend.
- Criar dashboard principal.
- Criar telas de ativos, transações e posição.
- Integrar autenticação no frontend.

### Fase 5 — Módulos compartilhados

- Criar `users`.
- Expandir `accounts` e `settings`.
- Preparar base de categorias e relatórios.

### Fase 6 — Finanças pessoais

- Implementar receitas e despesas.
- Implementar orçamento mensal.
- Implementar recorrências.
- Implementar relatórios financeiros pessoais.
- Integrar visão patrimonial total com investimentos.

### Backlog técnico (sem prioridade definida)

- Corporate actions automáticos: detecção de splits, grupamentos e mudanças de ticker via Yahoo Finance.
- Backfill de snapshots DAILY para o histórico completo da carteira.
- Fluxo completo de autenticação (`users`, refresh token, permissões).

## Como usar este README

Este README funciona como documento vivo do projeto. Sempre que um módulo mudar de estado, uma decisão técnica for tomada ou uma fase for concluída, atualizar este arquivo mantém a clareza e a continuidade do desenvolvimento.

Checklist de atualização recomendada:

- Atualizar status dos módulos.
- Registrar novos módulos criados.
- Registrar decisões técnicas relevantes.
- Ajustar roadmap quando a prioridade mudar.
