# SIG — Sistema de Gestão de Investimentos

Projeto pessoal em evolução para um sistema modular de gestão de carteira de investimentos, com visão de longo prazo para expansão em gestão financeira pessoal. A direção arquitetural mais adequada para o estágio atual é um **monólito modular**: um único sistema por enquanto, mas organizado por domínios de negócio claros, reduzindo complexidade operacional e facilitando crescimento futuro.[1][2]

## Visão do produto

O objetivo atual do SIG é consolidar a gestão de carteira de investimentos em um único sistema, cobrindo cadastro de ativos, transações, histórico de preços, eventos de renda, posição consolidada e snapshots da carteira.[1] A visão futura é expandir a mesma base para um sistema mais amplo de finanças pessoais, aproveitando módulos compartilhados e evitando retrabalho estrutural.[2]

## Objetivos da fase atual

Nesta fase, o foco principal do projeto é construir um núcleo confiável de investimentos antes de abrir novas frentes funcionais. Isso significa priorizar backend, regras de negócio, integração com dados de mercado, autenticação básica e preparação para um frontend futuro.[1][3]

Objetivos imediatos:

- Consolidar o backend modular.
- Fechar o núcleo de investimentos.
- Manter o Docker e o ambiente local estáveis.
- Usar o README como guia vivo de arquitetura e progresso.
- Preparar a base para um frontend e para expansão futura.

## Stack atual

A stack atual do projeto foi pensada para permitir crescimento incremental, com backend tipado, banco relacional e ambiente local reproduzível por containers. Essa combinação é coerente com projetos em amadurecimento que precisam de clareza estrutural sem a complexidade inicial de microsserviços.[1][4]

| Camada | Tecnologia | Papel no sistema |
|---|---|---|
| Backend | Node.js + Express + TypeScript | API, regras de negócio e organização modular |
| ORM | Prisma | Acesso ao banco e modelagem de dados |
| Banco | PostgreSQL | Persistência dos dados |
| Infra local | Docker Compose | Ambiente de desenvolvimento com API e banco |
| Validação | Zod | Validação de payloads e entradas |
| Integrações | Brapi e fontes externas | Preços, históricos e eventos de mercado |
| Futuro frontend | Ainda em definição | Camada visual do produto |

## Arquitetura modular

A arquitetura do SIG deve ser guiada por domínios, e não por telas isoladas ou por endpoints soltos. A melhor forma de evoluir o sistema agora é separar claramente aquilo que é base da plataforma, aquilo que pertence ao domínio de investimentos e aquilo que será o domínio futuro de finanças pessoais.[1][2]

### 1. Base do sistema

Esses módulos sustentam qualquer área do produto e devem ser reutilizados por investimentos e por finanças pessoais.

- `auth`: login, emissão e validação de token.
- `users`: usuários do sistema, perfis e preferências.
- `settings`: parâmetros globais do sistema.
- `institutions`: corretoras, bancos e instituições financeiras.
- `accounts`: contas de investimento, contas bancárias e futuras carteiras financeiras.
- `shared`: erros, middlewares, utilitários, constantes e helpers reutilizáveis.
- `core`: bootstrap do servidor, configuração e Prisma.

### 2. Domínio de investimentos

Esse é o núcleo atual do produto e deve permanecer como foco principal nas próximas etapas.

- `asset-classes`: classes de ativos.
- `assets`: cadastro e metadados dos ativos.
- `transactions`: compras, vendas e movimentações.
- `price-history`: histórico de preços.
- `income-events`: dividendos, juros, rendimentos e proventos.
- `portfolio-items`: posição consolidada por ativo.
- `portfolio-snapshots`: fotografia da carteira por data.

### 3. Domínio futuro de finanças pessoais

Esses módulos ainda não são prioridade imediata, mas já devem ser previstos no desenho para evitar acoplamento indevido.

- `categories`: categorias financeiras.
- `cash-transactions`: receitas, despesas e transferências.
- `budgets`: orçamento mensal.
- `recurring-payments`: lançamentos recorrentes.
- `cards`: cartões e faturas.
- `reports`: relatórios consolidados de vida financeira.
- `goals`: metas financeiras e planejamento.

## Estrutura sugerida de pastas

A estrutura abaixo mantém o projeto simples para o estágio atual e, ao mesmo tempo, organizada o suficiente para crescer sem virar um bloco confuso.[1][4]

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
    portfolio-items/
    portfolio-snapshots/
    categories/           # futuro
    cash-transactions/    # futuro
    budgets/              # futuro
    reports/              # futuro
```

## Estado atual do sistema

O projeto já possui uma base backend funcional, com ambiente Docker ativo, build validado e rotas principais de investimentos sendo organizadas por módulo. O sistema já demonstrou responder ao health check e já possui evolução recente em tratamento de erros, autenticação e ajustes de infraestrutura.[3][5]

### Módulos atuais

| Módulo | Status | Observação |
|---|---|---|
| `auth` | Em andamento | Rota de login existente, mas fluxo de usuário inicial ainda precisa ser definido |
| `asset-classes` | Funcional | Base para classificação dos ativos |
| `assets` | Funcional | Cadastro e consulta de ativos já estruturados |
| `transactions` | Funcional | CRUD principal construído |
| `price-history` | Em andamento | Estrutura montada e integração em evolução |
| `income-events` | Em andamento | Módulo existente, ainda em consolidação |
| `portfolio-items` | Em andamento | Recalculo e consolidação em evolução |
| `portfolio-snapshots` | Em andamento | Preparando base para visão temporal da carteira |
| `users` | Planejado | Ainda não implementado |
| `accounts` | Planejado | Importante para evolução futura |
| `cash-transactions` | Planejado | Parte do domínio futuro de finanças pessoais |
| `budgets` | Planejado | Parte do domínio futuro de finanças pessoais |

## Decisões arquiteturais atuais

Algumas decisões devem orientar o projeto daqui para frente para reduzir retrabalho.

- O SIG continuará como **monólito modular** nesta fase.[1][2]
- O foco imediato permanece no **domínio de investimentos**.[3]
- A autenticação deve ser simples no começo, mas já preparada para crescimento.
- O frontend será construído depois que o núcleo backend estiver mais estável.
- O domínio de finanças pessoais será adicionado como expansão, não como mistura precoce com investimentos.

## Roadmap recomendado

A ordem das entregas importa bastante para manter o projeto sob controle. O caminho mais seguro é evoluir por blocos de valor, fechando primeiro a base técnica e o núcleo funcional antes de abrir novos domínios.[5][3]

### Fase 1 — Base técnica

- Estabilizar Docker e fluxo local.
- Consolidar tratamento de erros.
- Padronizar validações com Zod.
- Fechar o fluxo mínimo de autenticação.
- Manter CI rodando no GitHub Actions.

### Fase 2 — Núcleo de investimentos

- Fechar `price-history`.
- Fechar `income-events`.
- Consolidar `portfolio-items`.
- Consolidar `portfolio-snapshots`.
- Validar regras de cálculo da carteira.

### Fase 3 — Experiência do produto

- Definir frontend inicial.
- Criar dashboard principal.
- Criar telas de ativos, transações e posição.
- Integrar autenticação no frontend.

### Fase 4 — Módulos compartilhados

- Criar `users`.
- Criar `accounts`.
- Criar `settings` e preferências.
- Preparar base de categorias e relatórios.

### Fase 5 — Finanças pessoais

- Implementar receitas e despesas.
- Implementar orçamento mensal.
- Implementar recorrências.
- Implementar relatórios financeiros pessoais.
- Integrar visão patrimonial total com investimentos.

## Como usar este README

Este README deve funcionar como documento vivo do projeto. Sempre que um módulo mudar de estado, uma decisão arquitetural for tomada ou uma fase for concluída, o ideal é atualizar este arquivo para manter clareza técnica e continuidade do desenvolvimento.[6][7]

Checklist de atualização recomendada:

- Atualizar status dos módulos.
- Registrar novos módulos criados.
- Ajustar roadmap quando a prioridade mudar.
- Registrar mudanças importantes na stack.
- Manter instruções de ambiente atualizadas.

## Próximo passo recomendado

O próximo passo mais coerente com a fase atual do SIG é consolidar o núcleo de investimentos antes de abrir a frente de usuários, frontend ou finanças pessoais. Em termos práticos, isso significa priorizar a conclusão de `price-history`, `income-events`, `portfolio-items` e `portfolio-snapshots`, pois esses módulos fecham a lógica central da carteira e sustentam o valor do produto desde já.[1][2]