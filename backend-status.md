# Sistema de Investimentos — Status do Backend

## Visão geral

Este projeto é um sistema próprio de investimentos com backend construído do zero no diretório `E:\Sistema Investimentos\App\sistema`, com foco principal em visão consolidada por ativo e por classe de ativo, e não por corretora como eixo central.

A base técnica atual usa Docker Compose, Prisma ORM, PostgreSQL, TypeScript e Zod para validação em runtime, formando uma fundação adequada para evoluir CRUDs, importação de dados e cálculos de carteira.[1][2]

## Objetivo de domínio

A direção funcional definida até aqui é que o sistema represente a carteira pelo ativo em si, enquanto conta, corretora ou custodiante devem ser informações auxiliares e opcionais, úteis para segmentação futura, mas não obrigatórias para o fluxo principal.

Também foi definido que a classificação macro dos ativos deve ficar em `AssetClass.code`, enquanto o tipo instrumental do ativo permanece em `assetType`, separando nacionalidade e categoria macro do tipo técnico do papel.

## Decisões de modelagem

O schema Prisma já contempla entidades centrais de investimentos como `AssetClass`, `Institution`, `Account`, `Asset`, `Transaction`, `IncomeEvent`, `PriceHistory`, `AllocationTarget`, `PortfolioSnapshot`, `PortfolioClassSnapshot`, `PortfolioAssetSnapshot` e `PortfolioItem`.

As convenções de classes já foram reorganizadas para remover a antiga categoria `EXTERIOR` e adotar códigos como `DOMESTIC_STOCK`, `STOCK`, `ETF`, `INTERNATIONAL_ETF`, `FII`, `BDR`, `CRYPTO`, `FIXED_INCOME`, `TREASURY` e `CASH`.

## Transactions

O módulo `transactions` passou por uma decisão de domínio importante: `accountId` deixou de ser obrigatório e passou a ser opcional, porque o gerenciamento principal da carteira não será orientado por corretora, mas pelo ativo negociado.[3]

Depois da migration correspondente, o backend foi ajustado para aceitar criação de transações sem conta e para não tentar consultar `Account` quando `accountId` não estiver presente, evitando erros de `findUnique` com `undefined`.[4][5]

O fluxo principal já foi validado com sucesso com uma transação `BUY` sem conta associada, vinculada ao ativo `PETR4`, incluindo `POST /transactions`, `GET /transactions` e `GET /transactions/:id`.

## Assets

O módulo `assets` já está funcional e foi validado com a criação bem-sucedida do ativo `PETR4`, associado à classe `DOMESTIC_STOCK`.

Essa validação confirmou que a tabela `AssetClass` está populada, que a foreign key `assetClassId` está íntegra e que o endpoint de criação de ativos está persistindo corretamente no banco.

## Git e versionamento

O projeto já foi colocado sob controle de versão com Git, com orientação para uso de `.gitignore`, commit de baseline e branch principal estável, o que melhora rollback, rastreabilidade e segurança de evolução do backend.[6][7]

Essa etapa foi importante porque o projeto está passando por mudanças estruturais em schema, migrations, Docker e services, e esse tipo de contexto se beneficia diretamente de commits pequenos e reversíveis.[6]

## Infraestrutura

O backend está rodando com Docker Compose, incluindo aplicação e banco, e houve ajuste no mapeamento de portas para contornar restrições do Windows ao expor a porta originalmente usada para o Prisma Studio.[8]

O Prisma Studio também foi testado em ambiente Docker/Windows, e ficou definido que o erro `spawn xdg-open ENOENT` não indica falha do Studio, mas apenas tentativa malsucedida de abrir navegador dentro do container sem interface gráfica.[9][10]

## Papel do Zod

O Zod foi adotado como camada de validação em runtime para os payloads da API, preenchendo a lacuna entre tipagem estática do TypeScript e dados efetivamente recebidos nas requisições HTTP.[1][11]

Essa escolha é importante porque impede que valores inválidos cheguem à regra de negócio e ao banco, especialmente em payloads financeiros com datas, enums e valores decimais.[1]

## O que já está concluído

- Estrutura inicial do backend criada no projeto `E:\Sistema Investimentos\App\sistema`.
- Ambiente com Docker Compose em funcionamento.
- Controle de versão com Git inicializado.[6]
- Schema Prisma modelado para o domínio de investimentos.
- Convenções de `AssetClass` redefinidas para o novo domínio.
- Campo `accountId` tornado opcional em `Transaction` com migration aplicada.[3]
- Criação de ativo validada com `PETR4`.
- Criação, listagem e busca por id de transações validadas no módulo `transactions`.

## Pendências imediatas

O módulo `transactions` ainda precisa ter o CRUD completamente fechado com testes de `PATCH /transactions/:id` e `DELETE /transactions/:id`, para garantir que atualização e remoção também funcionem no cenário já validado de transações sem conta.[2]

Também é recomendável padronizar o retorno das queries com um `include` compartilhado no Prisma, para que `create`, `findAll`, `findById` e `update` retornem sempre a mesma estrutura de relacionamentos, incluindo `asset.assetClass`.[12][13]

## Pontos de melhoria

### Padronização do Prisma client

Há um ponto estrutural lembrado no contexto do projeto relacionado à inconsistência do caminho de import do Prisma client no container, com divergência entre a localização real do arquivo e o caminho esperado por alguns módulos.

Esse ponto deve ser consolidado cedo para evitar que o crescimento do projeto gere imports frágeis e bugs difíceis de rastrear.

### Documentação no repositório

O projeto já tem volume suficiente de decisões técnicas e de domínio para ganhar documentação interna em Markdown versionada junto do código, o que é uma prática recomendada em projetos Git porque mantém arquitetura e implementação evoluindo juntas.[14]

A estrutura mínima recomendada é um `README.md` de visão geral e uma pasta `docs/` com arquivos sobre domínio, status do backend, endpoints e estratégia de importação.[14]

### Contrato de resposta da API

Os endpoints de `transactions` ainda podem ser refinados para retornar estruturas mais consistentes entre listagem, criação, detalhe e atualização, reduzindo complexidade futura do frontend e de integrações.[12]

### Estratégia de dados históricos

Existe uma oportunidade importante já identificada: integrar a API de tickers da B3 que já contém preços históricos e dividendos, para popular `PriceHistory` e `IncomeEvent` de forma retroativa.

Isso destrava futuramente cálculos de valorização histórica, proventos recebidos e snapshots mais completos de carteira.

## Próximos passos recomendados

### Curto prazo

1. Fechar o CRUD de `transactions` com `PATCH` e `DELETE`.[2]
2. Padronizar o `transactions.service.ts` com um `include` único reutilizável.[12]
3. Consolidar imports do Prisma client em todos os módulos.
4. Criar documentação versionada do projeto no repositório.[14]

### Médio prazo

1. Definir e documentar o papel futuro de `Account` como dimensão opcional de custódia/origem.
2. Implementar módulos ligados a eventos de renda (`IncomeEvent`) e histórico de preço (`PriceHistory`).
3. Preparar a ingestão da planilha `Investimentos-Leo` e da API B3 para carga inicial e enriquecimento histórico.

## Estrutura sugerida de documentação

A organização documental recomendada neste estágio é a seguinte:[14]

- `README.md` — visão geral, stack, setup e comandos principais.[14]
- `docs/domain.md` — decisões de domínio, enums e relacionamento entre entidades.
- `docs/backend-status.md` — estado atual do backend e pendências.
- `docs/api.md` — endpoints, payloads e contratos de resposta.[2]
- `docs/importacao.md` — plano de carga inicial via planilha e API B3.

## Conclusão operacional

O backend já saiu da fase de estruturação teórica e entrou em uma fase validada por persistência real, com criação de ativos e transações funcionando no banco.

O próximo bloco de evolução mais racional é consolidar o módulo `transactions`, documentar o estado atual do projeto e então seguir para enriquecimento de dados históricos e novos módulos de domínio financeiro.[2]