import express from 'express'
import cors    from 'cors'
import helmet  from 'helmet'

import { authRouter }              from './modules/auth/auth.routes'
import { assetClassesRouter }      from './modules/asset-classes/asset-classes.routes'
import { assetsRouter }            from './modules/assets/assets.routes'
import { transactionsRouter }      from './modules/transactions/transactions.routes'
import { priceHistoryRouter }      from './modules/price-history/price-history.routes'
import { incomeEventsRouter }      from './modules/income-events/income-events.routes'
import { portfolioItemsRouter }    from './modules/portfolio-items/portfolio-items.routes'
import { portfolioSnapshotsRouter } from './modules/portfolio-snapshots/portfolio-snapshots.routes'
import { authenticate }            from './shared/middleware/authenticate'
import { errorHandler }            from './shared/middleware/errorHandler'

const app  = express()
const PORT = Number(process.env.PORT ?? 3001)
const HOST = '0.0.0.0'

// ── Segurança & parsing ──────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

// ── Rotas públicas ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() })
})
app.use('/auth', authRouter)

// ── Rotas protegidas (exige JWT) ─────────────────────────────────────────────
app.use('/asset-classes',        authenticate, assetClassesRouter)
app.use('/assets',               authenticate, assetsRouter)
app.use('/transactions',         authenticate, transactionsRouter)
app.use('/price-history',        authenticate, priceHistoryRouter)
app.use('/income-events',        authenticate, incomeEventsRouter)
app.use('/portfolio-items',      authenticate, portfolioItemsRouter)
app.use('/portfolio-snapshots',  authenticate, portfolioSnapshotsRouter)

// ── Middleware centralizado de erros (deve ficar APÓS as rotas) ──────────────
app.use(errorHandler)

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`)
})
