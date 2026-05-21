import express from 'express'
import { assetClassesRouter } from './modules/asset-classes/asset-classes.routes'
import { assetsRouter } from './modules/assets/assets.routes'
import { transactionsRouter } from './modules/transactions/transactions.routes'
import { priceHistoryRouter } from './modules/price-history/price-history.routes'
import { incomeEventsRouter } from './modules/income-events/income-events.routes'
import { portfolioItemsRouter } from './modules/portfolio-items/portfolio-items.routes'
import { portfolioSnapshotsRouter } from './modules/portfolio-snapshots/portfolio-snapshots.routes'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const HOST = '0.0.0.0'

app.use(express.json())

app.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: 'API funcionando corretamente.',
  })
})

app.use('/asset-classes',       assetClassesRouter)
app.use('/assets',              assetsRouter)
app.use('/transactions',        transactionsRouter)
app.use('/price-history',       priceHistoryRouter)
app.use('/income-events',       incomeEventsRouter)
app.use('/portfolio-items',     portfolioItemsRouter)
app.use('/portfolio-snapshots', portfolioSnapshotsRouter)

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`)
})
