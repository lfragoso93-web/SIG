import express from 'express'
import { assetClassesRouter } from './modules/asset-classes/asset-classes.routes'
import { assetsRouter } from './modules/assets/assets.routes'
import { transactionsRouter } from "./modules/transactions/transactions.routes";
import priceHistoryImportRoutes from './modules/price-history/price-history.import.routes';

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

app.use('/api', priceHistoryImportRoutes)
app.use('/asset-classes', assetClassesRouter)
app.use('/assets', assetsRouter)
app.use('/transactions', transactionsRouter)

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`)
})