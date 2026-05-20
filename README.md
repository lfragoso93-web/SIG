Sistema de Investimentos
Backend de um sistema próprio de investimentos com foco em consolidação por ativo, classificação por classe de ativo e evolução futura para preços históricos, proventos e snapshots de carteira.

O projeto está em desenvolvimento no diretório E:\Sistema Investimentos\App\sistema, já roda com Docker Compose e Prisma, e tem os módulos assets e transactions funcionando com persistência real validada.

Objetivo
O sistema foi desenhado para organizar investimentos com visão orientada ao ativo, em vez de depender de corretora como eixo principal. Por isso, o domínio foi ajustado para tratar conta/custodiante como informação opcional em Transaction, sem bloquear o fluxo principal da carteira.
​

A base também foi preparada para receber futuramente dados históricos de uma API com tickers da B3, incluindo preços e dividendos, permitindo enriquecer módulos como PriceHistory e IncomeEvent.

Stack atual
Camada	Tecnologia	Papel no projeto
Backend	Node.js + TypeScript	API principal do sistema.
HTTP	Express	Exposição dos endpoints REST.
ORM	Prisma	Modelagem, migrations e acesso ao PostgreSQL.
​
Banco	PostgreSQL	Persistência principal dos dados.
​
Validação	Zod	Validação de payloads em runtime.
Infra	Docker Compose	Orquestração do app e banco no ambiente local.
Versionamento	Git	Controle de histórico e evolução do código.
​
Decisões de domínio
Classificação de ativos
A modelagem separa assetType de assetClass. O assetType representa o tipo técnico do instrumento, enquanto a classificação macro e a distinção entre nacional e internacional ficam em AssetClass.code.

As convenções principais já definidas incluem DOMESTIC_STOCK, STOCK, ETF, INTERNATIONAL_ETF, FII, BDR, CRYPTO, FIXED_INCOME, TREASURY e CASH, substituindo a antiga lógica baseada em EXTERIOR.

Transactions orientadas ao ativo
O módulo transactions foi ajustado para permitir transações sem accountId, porque a gestão da carteira neste sistema é orientada ao ativo e não à corretora. Essa decisão já foi refletida no schema, no backend e nos testes reais dos endpoints.

Modelos principais
O schema Prisma já contempla as entidades centrais do domínio de investimentos:

AssetClass

Institution

Account

Asset

Transaction

IncomeEvent

PriceHistory

AllocationTarget

PortfolioSnapshot

PortfolioClassSnapshot

PortfolioAssetSnapshot

PortfolioItem

Status atual
Concluído
Estrutura inicial do backend criada.

Ambiente local com Docker Compose funcionando.

Controle de versão com Git inicializado.
​

Schema Prisma modelado para o domínio principal.

Convenções de AssetClass redefinidas.

Módulo assets funcionando com criação validada de PETR4.

Módulo transactions com CRUD básico validado: POST, GET all, GET by id, PATCH e DELETE.

Documentação inicial de status criada no arquivo backend-status.md.

Em aberto
Padronizar exports/imports de services e Prisma client no projeto inteiro.

Revisar por que asset.assetClass aparece vazio em algumas respostas do módulo transactions.

Criar documentação complementar em docs/ para domínio, API e importação.
​

Implementar os próximos módulos de dados históricos e proventos.

Estrutura esperada do projeto
A organização atual do backend segue a ideia de separar infraestrutura, domínio e módulos da API, com Prisma como núcleo de persistência e módulos independentes por recurso.
​

Estrutura resumida:

text
src/
  core/
    prisma/
  modules/
    assets/
    transactions/
Como executar
Pré-requisitos
Docker e Docker Compose instalados.

Git configurado localmente.
​

Variáveis de ambiente do projeto definidas, em especial DATABASE_URL, já que o Prisma client depende dela para instanciar a conexão com o PostgreSQL.

Subida do ambiente
O ambiente local foi validado com Docker Compose, incluindo aplicação e banco, e também com Prisma Studio acessível por porta exposta no host.
​

Comandos típicos do fluxo local:

bash
docker compose up -d
bash
docker compose logs -f app
bash
docker compose exec app npx prisma generate
bash
docker compose exec app npx prisma migrate dev
Prisma Studio
No ambiente Docker/Windows, o Prisma Studio não deve depender de abertura automática de navegador dentro do container. O uso com --browser none evita erros como spawn xdg-open ENOENT em containers sem interface gráfica.

Exemplo:

bash
docker compose exec app npx prisma studio --port 5555 --browser none
Depois disso, o acesso deve ser feito pela porta publicada no host, conforme o mapeamento definido no Compose.
​

Endpoints já validados
Assets
Exemplo de criação de ativo validada no projeto:

text
POST /assets
Payload de exemplo:

json
{
  "ticker": "PETR4",
  "name": "Petrobras PN",
  "assetType": "STOCK",
  "assetClassId": "<assetClassId>",
  "currencyCode": "BRL",
  "exchange": "B3"
}
Transactions
O módulo transactions já foi validado em cenário real com criação de compra de PETR4 sem accountId, atualização parcial e exclusão com retorno 204 No Content.
​

Endpoints validados:

POST /transactions

GET /transactions

GET /transactions/:id

PATCH /transactions/:id

DELETE /transactions/:id 

Boas práticas adotadas
Validação de entrada com Zod para evitar payload inválido em runtime.
​

Uso de Prisma para operações CRUD tipadas e modelagem explícita do banco.
​

Versionamento por Git com commits focados por entrega funcional.

Documentação versionada junto do código, permitindo rastrear decisões técnicas ao longo do tempo.
​

Próximos passos recomendados
Curto prazo
Padronizar default export vs named export em todo o backend.

Revisar a expansão de asset.assetClass nas respostas do módulo transactions.

Criar documentação complementar em docs/.
​

Médio prazo
Implementar e validar IncomeEvent.

Implementar e validar PriceHistory.

Integrar a API da B3 para ingestão de preços históricos e dividendos.

Preparar importação inicial de dados a partir de planilhas já existentes do projeto.

Documentação complementar
A documentação de status já foi iniciada e deve evoluir em paralelo ao código. A recomendação é manter pelo menos estes arquivos no repositório:
​

README.md

backend-status.md

docs/domain.md

docs/api.md

docs/importacao.md

Estado atual do repositório
O projeto já possui um commit que fecha o módulo transactions com CRUD básico e correções de wiring entre Prisma, service e controller, consolidando uma primeira entrega funcional do backend.