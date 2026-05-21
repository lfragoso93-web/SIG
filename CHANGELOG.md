# Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

---

## [0.2.0] — 2026-05-21

### Adicionado
- **Autenticação JWT** (`src/modules/auth/`)
  - `POST /auth/login` — retorna token JWT (público)
  - Middleware `authenticate` protege todas as rotas exceto `/health` e `/auth`
  - Usuário/senha configuráveis via `APP_USERNAME` / `APP_PASSWORD` (env)
- **Vitest** como framework de testes
  - `vitest.config.ts` configurado com coverage via v8
  - Testes para `pagination` utils (`pagination.spec.ts`)
  - Testes para cálculo de posição/preço médio (`portfolio-calc.spec.ts`)
  - Testes para `auth.service` (`auth.spec.ts`)
- **`src/modules/portfolio-items/portfolio-items.calc.ts`** — lógica pura de cálculo extraída para arquivo testável separado
  - Suporte correto a BONUS (qty aumenta, custo não muda) e SPLIT
  - Proteção contra floating point: usa `toFixed` antes de criar `Prisma.Decimal`
- **`cors`** e **`helmet`** adicionados ao `src/index.ts`
- **`Dockerfile` multi-stage** (deps → builder → runner)
  - `npm install` no build, não no runtime
  - Imagem final sem devDependencies (~60% menor)
  - Roda `prisma migrate deploy` antes de subir
- **`docker-compose.yml`** reescrito
  - Usa `build.target: runner`
  - Healthcheck no serviço `db`; `api` aguarda o db estar saudável
  - Todas as variáveis sensíveis via env (sem hardcode)
- **`.env.example`** atualizado com `JWT_SECRET`, `APP_USERNAME`, `APP_PASSWORD`, `CORS_ORIGIN`
- **`package.json`** limpo — removidas deps do Next.js/React (projeto é API-only); adicionados scripts de teste

### Modificado
- `portfolio-items.service.ts` — usa `calcPositionFromTxs` do arquivo `.calc.ts`; inclui `account` no `include` para retornar `accountName`
- `src/index.ts` — registra `helmet`, `cors`, `authRouter` e `authenticate` como middleware de rotas protegidas

---

## [0.1.0] — 2026-05-21

### Adicionado
- `src/shared/errors/AppError.ts` — classes de erro tipadas
- `src/shared/middleware/errorHandler.ts` — middleware centralizado
- `src/shared/middleware/validate.ts` — middleware factory Zod
- `src/shared/utils/pagination.ts` — paginação consistente
- `src/modules/assets/assets.schema.ts` — schemas Zod
- `.env.example`, `CHANGELOG.md`

### Modificado
- Todos os modules: `next(err)`, enums Prisma sem `as any`, paginação nos `findAll`
- `.gitignore` atualizado
