/**
 * seed-portfolio.ts
 * Cadastra os ativos da carteira e todas as transacões de compra.
 * Idempotente: usa upsert nos ativos e skipDuplicates nas transacões.
 *
 * Execucao:
 *   docker compose exec app npx ts-node prisma/seed-portfolio.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

// ---------------------------------------------------------------------------
// 1. Mapa de ativos: ticker -> { name, assetClassCode, assetType }
// ---------------------------------------------------------------------------
const ASSETS: Record<string, { name: string; classCode: string; type: string }> = {
  // FIIs
  MXRF11: { name: 'Maxi Renda',                   classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  SNEL11: { name: 'Sinqia Energy',                classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  GARE11: { name: 'Guardian Real Estate',         classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  RBRF11: { name: 'RBR Alpha Fundo',              classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  ARXD11: { name: 'Arx Elbrus',                   classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  VGHF11: { name: 'Valora Hedge Fund',            classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  XPML11: { name: 'XP Malls',                     classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  VINO11: { name: 'Vinci Offices',                classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  SNAG11: { name: 'Suno Agro',                    classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  ALZC11: { name: 'Alianza Cemig',                classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  CPTS11: { name: 'Capitania Securities',         classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  AAZQ11: { name: 'Alianza Ativos',               classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  VIUR11: { name: 'Vinci Urbano',                 classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  RBRX11: { name: 'RBR e-Commerce',               classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  VCRA11: { name: 'Vectis CRA',                   classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  XPCA11: { name: 'XP Credito Agro',              classCode: 'FII', type: 'REAL_ESTATE_FUND' },
  // ETFs
  DIVD11: { name: 'SPDR S&P Dividends ETF',       classCode: 'ETF', type: 'ETF' },
  COIN11: { name: 'Hashdex Nasdaq Crypto',         classCode: 'ETF', type: 'ETF' },
  QQQI11: { name: 'Invesco QQQ Innovation',        classCode: 'ETF', type: 'ETF' },
  AREA11: { name: 'iShares Real Estate',           classCode: 'ETF', type: 'ETF' },
  AURO11: { name: 'iShares Gold',                  classCode: 'ETF', type: 'ETF' },
  // BDRs
  NIKE34: { name: 'Nike BDR',                      classCode: 'BDR', type: 'BDR' },
  NVDC34: { name: 'Nvidia BDR',                    classCode: 'BDR', type: 'BDR' },
  E1CO34: { name: 'Ecolab BDR',                    classCode: 'BDR', type: 'BDR' },
  // Ações nacionais
  PETR4:  { name: 'Petrobras PN',                  classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  JHSF3:  { name: 'JHSF Participações',           classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  ITSA4:  { name: 'Itausa PN',                     classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  AMOB3:  { name: 'Amob Tecnologia',               classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  RANI3:  { name: 'Irani Papel e Embalagem',       classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  POMO4:  { name: 'Marcopolo PN',                  classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  PETZ3:  { name: 'Petz',                          classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  FIQE3:  { name: 'Fique Bem Agro',                classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  ALOS3:  { name: 'Allos',                         classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  BRBI11: { name: 'BR Advisory Partners',          classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  KLBN4:  { name: 'Klabin PN',                     classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  BMGB4:  { name: 'Banco BMG PN',                  classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  TAEE11: { name: 'Transmissora Aliança de Energia', classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  ALUP11: { name: 'Alupar Investimento',           classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  GOAU4:  { name: 'Metalurgica Gerdau PN',         classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  CXSE3:  { name: 'Caixa Seguridade',              classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  BBAS3:  { name: 'Banco do Brasil ON',            classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  KLBN11: { name: 'Klabin Units',                  classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  MTRE3:  { name: 'Mitre Realty',                  classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  MELK3:  { name: 'Méliuz',                         classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  BBDC3:  { name: 'Bradesco ON',                   classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  VULC3:  { name: 'Vulcabras',                     classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  SANB11: { name: 'Santander Brasil Units',        classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  EGIE3:  { name: 'Engie Brasil Energia',          classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
  WEGE3:  { name: 'Weg',                           classCode: 'DOMESTIC_STOCK', type: 'STOCK' },
}

// ---------------------------------------------------------------------------
// 2. Transacões (YYYY-MM-DD, preço como number)
// ---------------------------------------------------------------------------
type TxRow = { ticker: string; date: string; price: number; qty: number }

const TRANSACTIONS: TxRow[] = [
  { ticker: 'MXRF11', date: '2024-10-22', price: 9.70,   qty: 10 },
  { ticker: 'MXRF11', date: '2024-10-31', price: 9.65,   qty: 10 },
  { ticker: 'SNEL11', date: '2024-10-31', price: 8.82,   qty: 4  },
  { ticker: 'GARE11', date: '2024-11-04', price: 9.08,   qty: 10 },
  { ticker: 'SNEL11', date: '2024-11-04', price: 8.89,   qty: 6  },
  { ticker: 'RBRF11', date: '2024-11-06', price: 6.81,   qty: 10 },
  { ticker: 'ARXD11', date: '2024-11-07', price: 8.85,   qty: 10 },
  { ticker: 'MXRF11', date: '2024-11-11', price: 9.35,   qty: 5  },
  { ticker: 'RBRF11', date: '2024-11-12', price: 6.74,   qty: 10 },
  { ticker: 'VGHF11', date: '2024-11-13', price: 7.80,   qty: 10 },
  { ticker: 'XPML11', date: '2024-11-14', price: 103.85, qty: 2  },
  { ticker: 'VINO11', date: '2024-11-26', price: 5.09,   qty: 10 },
  { ticker: 'GARE11', date: '2024-11-29', price: 8.91,   qty: 10 },
  { ticker: 'MXRF11', date: '2024-11-29', price: 9.37,   qty: 5  },
  { ticker: 'VINO11', date: '2024-11-29', price: 5.04,   qty: 20 },
  { ticker: 'XPML11', date: '2024-11-29', price: 99.90,  qty: 2  },
  { ticker: 'SNAG11', date: '2024-12-03', price: 9.64,   qty: 10 },
  { ticker: 'RBRF11', date: '2024-12-04', price: 6.54,   qty: 10 },
  { ticker: 'SNAG11', date: '2024-12-10', price: 9.33,   qty: 20 },
  { ticker: 'SNEL11', date: '2024-12-10', price: 8.77,   qty: 20 },
  { ticker: 'VGHF11', date: '2024-12-10', price: 7.03,   qty: 20 },
  { ticker: 'DIVD11', date: '2024-12-13', price: 52.59,  qty: 2  },
  { ticker: 'ARXD11', date: '2024-12-30', price: 7.50,   qty: 20 },
  { ticker: 'GARE11', date: '2024-12-30', price: 8.68,   qty: 20 },
  { ticker: 'RBRF11', date: '2024-12-30', price: 6.47,   qty: 20 },
  { ticker: 'VINO11', date: '2024-12-30', price: 4.98,   qty: 20 },
  { ticker: 'XPML11', date: '2024-12-30', price: 99.51,  qty: 1  },
  { ticker: 'MXRF11', date: '2025-01-02', price: 9.31,   qty: 10 },
  { ticker: 'SNEL11', date: '2025-01-02', price: 8.72,   qty: 10 },
  { ticker: 'JHSF3',  date: '2025-01-07', price: 3.78,   qty: 20 },
  { ticker: 'ITSA4',  date: '2025-01-10', price: 8.71,   qty: 5  },
  { ticker: 'AMOB3',  date: '2025-01-13', price: 17.50,  qty: 2  },
  { ticker: 'RANI3',  date: '2025-01-13', price: 6.99,   qty: 5  },
  { ticker: 'POMO4',  date: '2025-01-16', price: 7.89,   qty: 1  },
  { ticker: 'DIVD11', date: '2025-01-21', price: 49.79,  qty: 2  },
  { ticker: 'JHSF3',  date: '2025-01-21', price: 3.76,   qty: 20 },
  { ticker: 'VGHF11', date: '2025-01-21', price: 7.11,   qty: 10 },
  { ticker: 'VINO11', date: '2025-01-21', price: 4.72,   qty: 10 },
  { ticker: 'ARXD11', date: '2025-01-30', price: 7.12,   qty: 10 },
  { ticker: 'COIN11', date: '2025-01-30', price: 103.05, qty: 2  },
  { ticker: 'DIVD11', date: '2025-01-30', price: 51.39,  qty: 2  },
  { ticker: 'GARE11', date: '2025-01-30', price: 7.86,   qty: 10 },
  { ticker: 'NIKE34', date: '2025-02-03', price: 44.50,  qty: 1  },
  { ticker: 'DIVD11', date: '2025-02-04', price: 51.09,  qty: 1  },
  { ticker: 'PETZ3',  date: '2025-02-04', price: 4.50,   qty: 10 },
  { ticker: 'ARXD11', date: '2025-02-05', price: 7.88,   qty: 10 },
  { ticker: 'NVDC34', date: '2025-02-12', price: 16.04,  qty: 1  },
  { ticker: 'ITSA4',  date: '2025-02-17', price: 9.87,   qty: 5  },
  { ticker: 'XPML11', date: '2025-02-27', price: 95.68,  qty: 2  },
  { ticker: 'SNAG11', date: '2025-02-27', price: 9.23,   qty: 10 },
  { ticker: 'SNEL11', date: '2025-02-28', price: 8.73,   qty: 10 },
  { ticker: 'QQQI11', date: '2025-02-28', price: 102.76, qty: 2  },
  { ticker: 'NVDC34', date: '2025-02-28', price: 14.43,  qty: 2  },
  { ticker: 'POMO4',  date: '2025-02-28', price: 7.25,   qty: 4  },
  { ticker: 'FIQE3',  date: '2025-03-24', price: 3.60,   qty: 7  },
  { ticker: 'AMOB3',  date: '2025-03-26', price: 13.00,  qty: 4  },
  { ticker: 'ALOS3',  date: '2025-03-27', price: 19.53,  qty: 5  },
  { ticker: 'MXRF11', date: '2025-03-27', price: 9.08,   qty: 10 },
  { ticker: 'SNAG11', date: '2025-03-27', price: 9.16,   qty: 10 },
  { ticker: 'BRBI11', date: '2025-03-27', price: 14.40,  qty: 10 },
  { ticker: 'FIQE3',  date: '2025-03-27', price: 3.78,   qty: 13 },
  { ticker: 'KLBN4',  date: '2025-03-27', price: 3.84,   qty: 10 },
  { ticker: 'POMO4',  date: '2025-04-01', price: 6.11,   qty: 5  },
  { ticker: 'BMGB4',  date: '2025-04-01', price: 3.83,   qty: 10 },
  { ticker: 'PETR4',  date: '2025-04-03', price: 36.05,  qty: 3  },
  { ticker: 'PETR4',  date: '2025-04-03', price: 36.04,  qty: 2  },
  { ticker: 'ALOS3',  date: '2025-04-09', price: 19.12,  qty: 5  },
  { ticker: 'PETR4',  date: '2025-04-09', price: 31.46,  qty: 5  },
  { ticker: 'ALZC11', date: '2025-04-16', price: 7.93,   qty: 40 },
  { ticker: 'JHSF3',  date: '2025-04-16', price: 4.34,   qty: 10 },
  { ticker: 'CPTS11', date: '2025-04-16', price: 6.73,   qty: 50 },
  { ticker: 'COIN11', date: '2025-04-28', price: 83.69,  qty: 3  },
  { ticker: 'AAZQ11', date: '2025-04-30', price: 7.34,   qty: 20 },
  { ticker: 'ALZC11', date: '2025-04-30', price: 8.69,   qty: 10 },
  { ticker: 'QQQI11', date: '2025-04-30', price: 93.40,  qty: 2  },
  { ticker: 'E1CO34', date: '2025-05-02', price: 23.03,  qty: 2  },
  { ticker: 'NIKE34', date: '2025-05-05', price: 32.75,  qty: 2  },
  { ticker: 'TAEE11', date: '2025-05-08', price: 35.99,  qty: 1  },
  { ticker: 'TAEE11', date: '2025-05-08', price: 35.96,  qty: 1  },
  { ticker: 'BMGB4',  date: '2025-05-08', price: 3.83,   qty: 10 },
  { ticker: 'VIUR11', date: '2025-05-08', price: 5.60,   qty: 53 },
  { ticker: 'ALUP11', date: '2025-05-14', price: 29.47,  qty: 3  },
  { ticker: 'GOAU4',  date: '2025-05-15', price: 8.68,   qty: 10 },
  { ticker: 'AAZQ11', date: '2025-05-19', price: 7.31,   qty: 57 },
  { ticker: 'VIUR11', date: '2025-05-19', price: 5.70,   qty: 33 },
  { ticker: 'ARXD11', date: '2025-05-19', price: 7.27,   qty: 10 },
  { ticker: 'VIUR11', date: '2025-05-19', price: 5.70,   qty: 11 },
  { ticker: 'ARXD11', date: '2025-05-29', price: 7.43,   qty: 20 },
  { ticker: 'COIN11', date: '2025-05-29', price: 90.59,  qty: 1  },
  { ticker: 'CXSE3',  date: '2025-05-30', price: 15.04,  qty: 10 },
  { ticker: 'BBAS3',  date: '2025-05-30', price: 23.43,  qty: 20 },
  { ticker: 'CXSE3',  date: '2025-05-30', price: 14.91,  qty: 20 },
  { ticker: 'SNEL11', date: '2025-05-30', price: 8.61,   qty: 30 },
  { ticker: 'PETR4',  date: '2025-05-30', price: 31.11,  qty: 10 },
  { ticker: 'VGHF11', date: '2025-05-30', price: 7.78,   qty: 20 },
  { ticker: 'KLBN4',  date: '2025-06-04', price: 3.66,   qty: 10 },
  { ticker: 'MTRE3',  date: '2025-06-06', price: 3.92,   qty: 25 },
  { ticker: 'MELK3',  date: '2025-06-23', price: 3.38,   qty: 20 },
  { ticker: 'MTRE3',  date: '2025-06-24', price: 3.92,   qty: 25 },
  { ticker: 'MELK3',  date: '2025-06-24', price: 3.41,   qty: 30 },
  { ticker: 'BMGB4',  date: '2025-06-24', price: 3.63,   qty: 10 },
  { ticker: 'DIVD11', date: '2025-06-24', price: 53.51,  qty: 1  },
  { ticker: 'VIUR11', date: '2025-06-30', price: 5.77,   qty: 3  },
  { ticker: 'VGHF11', date: '2025-06-30', price: 7.76,   qty: 40 },
  { ticker: 'AAZQ11', date: '2025-06-30', price: 7.39,   qty: 23 },
  { ticker: 'SNEL11', date: '2025-06-30', price: 8.49,   qty: 20 },
  { ticker: 'MTRE3',  date: '2025-06-30', price: 3.89,   qty: 50 },
  { ticker: 'COIN11', date: '2025-06-30', price: 86.86,  qty: 2  },
  { ticker: 'RBRF11', date: '2025-07-01', price: 7.05,   qty: 50 },
  { ticker: 'TAEE11', date: '2025-07-04', price: 34.95,  qty: 3  },
  { ticker: 'QQQI11', date: '2025-07-04', price: 98.99,  qty: 2  },
  { ticker: 'KLBN4',  date: '2025-07-09', price: 3.72,   qty: 20 },
  { ticker: 'BBDC3',  date: '2025-07-14', price: 13.81,  qty: 10 },
  { ticker: 'BMGB4',  date: '2025-07-16', price: 3.74,   qty: 40 },
  { ticker: 'BBDC3',  date: '2025-07-21', price: 13.54,  qty: 10 },
  { ticker: 'FIQE3',  date: '2025-07-21', price: 3.68,   qty: 10 },
  { ticker: 'ALZC11', date: '2025-07-30', price: 7.63,   qty: 50 },
  { ticker: 'ARXD11', date: '2025-07-30', price: 7.63,   qty: 20 },
  { ticker: 'DIVD11', date: '2025-07-30', price: 52.28,  qty: 2  },
  { ticker: 'QQQI11', date: '2025-07-30', price: 102.93, qty: 2  },
  { ticker: 'TAEE11', date: '2025-07-31', price: 33.55,  qty: 3  },
  { ticker: 'VIUR11', date: '2025-08-25', price: 5.31,   qty: 30 },
  { ticker: 'MXRF11', date: '2025-08-28', price: 9.59,   qty: 20 },
  { ticker: 'SNAG11', date: '2025-08-28', price: 9.57,   qty: 20 },
  { ticker: 'VIUR11', date: '2025-08-28', price: 5.39,   qty: 20 },
  { ticker: 'RBRF11', date: '2025-08-28', price: 6.54,   qty: 20 },
  { ticker: 'MTRE3',  date: '2025-09-04', price: 3.68,   qty: 50 },
  { ticker: 'BBAS3',  date: '2025-09-04', price: 20.50,  qty: 5  },
  { ticker: 'AREA11', date: '2025-09-30', price: 100.73, qty: 2  },
  { ticker: 'AURO11', date: '2025-09-30', price: 103.30, qty: 2  },
  { ticker: 'COIN11', date: '2025-09-30', price: 83.29,  qty: 4  },
  { ticker: 'MXRF11', date: '2025-09-30', price: 9.78,   qty: 10 },
  { ticker: 'SNAG11', date: '2025-09-30', price: 9.54,   qty: 10 },
  { ticker: 'GARE11', date: '2025-09-30', price: 9.03,   qty: 10 },
  { ticker: 'COIN11', date: '2025-10-08', price: 88.94,  qty: 2  },
  { ticker: 'AREA11', date: '2025-10-08', price: 100.15, qty: 2  },
  { ticker: 'MTRE3',  date: '2025-10-20', price: 3.61,   qty: 70 },
  { ticker: 'AURO11', date: '2025-10-30', price: 106.27, qty: 2  },
  { ticker: 'QQQI11', date: '2025-10-30', price: 103.15, qty: 2  },
  { ticker: 'TAEE11', date: '2025-10-30', price: 38.03,  qty: 2  },
  { ticker: 'VULC3',  date: '2025-11-03', price: 23.30,  qty: 20 },
  { ticker: 'KLBN11', date: '2025-11-05', price: 18.53,  qty: 10 },
  { ticker: 'RBRX11', date: '2025-11-26', price: 7.59,   qty: 102 },
  { ticker: 'RBRX11', date: '2025-11-27', price: 7.72,   qty: 8  },
  { ticker: 'SNEL11', date: '2025-12-05', price: 8.49,   qty: 10 },
  { ticker: 'COIN11', date: '2025-12-09', price: 68.67,  qty: 2  },
  { ticker: 'VCRA11', date: '2026-01-06', price: 63.79,  qty: 3  },
  { ticker: 'GARE11', date: '2026-01-09', price: 9.01,   qty: 10 },
  { ticker: 'COIN11', date: '2026-01-29', price: 57.85,  qty: 4  },
  { ticker: 'GARE11', date: '2026-01-29', price: 8.72,   qty: 10 },
  { ticker: 'GARE11', date: '2026-02-02', price: 8.74,   qty: 20 },
  { ticker: 'MXRF11', date: '2026-02-02', price: 9.50,   qty: 20 },
  { ticker: 'VGHF11', date: '2026-02-02', price: 7.12,   qty: 30 },
  { ticker: 'AREA11', date: '2026-02-02', price: 105.50, qty: 2  },
  { ticker: 'XPCA11', date: '2026-02-24', price: 8.73,   qty: 24 },
  { ticker: 'XPCA11', date: '2026-02-26', price: 8.83,   qty: 16 },
  { ticker: 'AREA11', date: '2026-02-26', price: 104.79, qty: 2  },
  { ticker: 'VGHF11', date: '2026-02-27', price: 7.27,   qty: 20 },
  { ticker: 'COIN11', date: '2026-03-05', price: 47.52,  qty: 5  },
  { ticker: 'MTRE3',  date: '2026-03-06', price: 3.83,   qty: 80 },
  { ticker: 'SNAG11', date: '2026-03-12', price: 10.83,  qty: 20 },
  { ticker: 'XPCA11', date: '2026-03-12', price: 8.72,   qty: 30 },
  { ticker: 'RBRX11', date: '2026-03-12', price: 8.78,   qty: 20 },
  { ticker: 'GARE11', date: '2026-03-12', price: 8.38,   qty: 15 },
  { ticker: 'ALOS3',  date: '2026-03-24', price: 29.56,  qty: 14 },
  { ticker: 'XPCA11', date: '2026-03-30', price: 8.74,   qty: 15 },
  { ticker: 'GARE11', date: '2026-03-30', price: 8.43,   qty: 15 },
  { ticker: 'ALOS3',  date: '2026-04-01', price: 31.05,  qty: 6  },
  { ticker: 'QQQI11', date: '2026-04-08', price: 90.37,  qty: 5  },
  { ticker: 'ALOS3',  date: '2026-04-08', price: 31.55,  qty: 10 },
  { ticker: 'XPCA11', date: '2026-04-08', price: 8.39,   qty: 15 },
  { ticker: 'POMO4',  date: '2026-04-13', price: 6.66,   qty: 12 },
  { ticker: 'ALOS3',  date: '2026-04-15', price: 33.48,  qty: 5  },
  { ticker: 'SANB11', date: '2026-04-15', price: 31.93,  qty: 20 },
  { ticker: 'AURO11', date: '2026-04-30', price: 103.47, qty: 4  },
  { ticker: 'NIKE34', date: '2026-04-30', price: 22.15,  qty: 3  },
  { ticker: 'POMO4',  date: '2026-04-30', price: 6.44,   qty: 18 },
  { ticker: 'SNEL11', date: '2026-04-30', price: 8.53,   qty: 20 },
  { ticker: 'COIN11', date: '2026-04-30', price: 47.07,  qty: 5  },
  { ticker: 'ALOS3',  date: '2026-04-30', price: 30.34,  qty: 5  },
  { ticker: 'EGIE3',  date: '2026-05-05', price: 34.40,  qty: 2  },
  { ticker: 'WEGE3',  date: '2026-05-06', price: 45.15,  qty: 8  },
  { ticker: 'RBRX11', date: '2026-05-11', price: 8.65,   qty: 20 },
  { ticker: 'SNEL11', date: '2026-05-11', price: 8.54,   qty: 20 },
  { ticker: 'GARE11', date: '2026-05-11', price: 8.27,   qty: 20 },
  { ticker: 'SNAG11', date: '2026-05-11', price: 10.63,  qty: 20 },
  { ticker: 'BBAS3',  date: '2026-05-20', price: 20.55,  qty: 5  },
  { ticker: 'WEGE3',  date: '2026-05-20', price: 42.28,  qty: 2  },
  { ticker: 'EGIE3',  date: '2026-05-20', price: 32.64,  qty: 3  },
]

// ---------------------------------------------------------------------------
// 3. Main
// ---------------------------------------------------------------------------
async function main() {
  // Busca IDs de classes
  const classCodes = [...new Set(Object.values(ASSETS).map((a) => a.classCode))]
  const classRows  = await prisma.assetClass.findMany({ where: { code: { in: classCodes } } })
  const classMap   = new Map(classRows.map((c) => [c.code, c.id]))

  for (const code of classCodes) {
    if (!classMap.has(code)) throw new Error(`AssetClass "${code}" não encontrada. Rode o seed principal primeiro.`)
  }

  // Upsert dos ativos
  console.log('Cadastrando ativos...')
  for (const [ticker, meta] of Object.entries(ASSETS)) {
    await prisma.asset.upsert({
      where:  { ticker },
      update: { name: meta.name, assetClassId: classMap.get(meta.classCode)!, isActive: true },
      create: {
        ticker,
        name:         meta.name,
        assetType:    meta.type as any,
        assetClassId: classMap.get(meta.classCode)!,
        currencyCode: 'BRL',
        isActive:     true,
      },
    })
  }
  console.log(`${Object.keys(ASSETS).length} ativos cadastrados.`)

  // Busca IDs dos ativos recém-inseridos
  const assetRows = await prisma.asset.findMany({ where: { ticker: { in: Object.keys(ASSETS) } } })
  const assetMap  = new Map(assetRows.map((a) => [a.ticker, a.id]))

  // Insere transacões
  console.log('Inserindo transações...')
  const txData = TRANSACTIONS.map((t) => {
    const gross = t.qty * t.price
    return {
      assetId:     assetMap.get(t.ticker)!,
      type:        'BUY' as const,
      status:      'POSTED' as const,
      tradeDate:   new Date(t.date),
      settleDate:  new Date(t.date),
      quantity:    t.qty,
      unitPrice:   t.price,
      grossAmount: gross,
      totalValue:  gross,
      fees:        0,
      currencyCode: 'BRL',
    }
  })

  const result = await prisma.transaction.createMany({ data: txData, skipDuplicates: false })
  console.log(`${result.count} transações inseridas.`)
  console.log('Seed concluído!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
