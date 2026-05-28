'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Search, ChevronRight, CheckCircle2, Loader2,
  AlertCircle, Sparkles,
} from 'lucide-react'
import { fmt } from '@/lib/utils'
import {
  useAssetClasses,
  useAssetByTicker,
  useCreateAsset,
  useCreateTransaction,
  type Asset,
  type AssetClass,
} from '@/lib/hooks/useTransactions'

type Step = 'type' | 'asset' | 'details' | 'confirm'

interface Props {
  open: boolean
  onClose: () => void
}

interface YahooQuote {
  shortName: string
  longName:  string
  regularMarketPrice?: number
  instrumentType?: string   // 'EQUITY' para tudo no BR
  currency?: string
}

// ── Yahoo Finance ─────────────────────────────────────────────────────

async function fetchYahoo(ticker: string): Promise<YahooQuote | null> {
  // Tenta primeiro com sufixo .SA (mercado brasileiro),
  // depois sem sufixo (internacionais: AAPL, MSFT, BRK-B...)
  const suffixes = ['.SA', '']
  for (const suffix of suffixes) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}${suffix}?interval=1d&range=1d`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(7000),
        },
      )
      if (!res.ok) continue
      const json  = await res.json()
      const meta  = json?.chart?.result?.[0]?.meta
      if (!meta?.symbol) continue
      const price = meta.regularMarketPrice ?? json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.at(-1)
      return {
        shortName:           meta.shortName   ?? '',
        longName:            meta.longName    ?? '',
        regularMarketPrice:  price,
        instrumentType:      meta.instrumentType ?? '',
        currency:            meta.currency ?? 'BRL',
      }
    } catch {
      continue
    }
  }
  return null
}

// ── Inferência de tipo e classe ───────────────────────────────────────────────

function inferAssetType(quote: YahooQuote | null, ticker: string): string {
  const tk   = ticker.toUpperCase()
  const long = (quote?.longName  ?? '').toLowerCase()
  const sn   = (quote?.shortName ?? '').toLowerCase()
  const combined = `${long} ${sn}`

  // FII — longName contém 'imobiliário' / 'imobiliaro' / 'fii' / shortName começa com 'fii'
  if (
    combined.includes('imobili') ||
    combined.includes('fii') ||
    sn.startsWith('fii')
  ) return 'FII'

  // ETF — nome inclui ishares / índice / index fund / atz / fundo de índice
  if (
    combined.includes('ishares') ||
    combined.includes('index fund') ||
    combined.includes('fundo de índice') ||
    combined.includes('fundo de indice') ||
    sn.includes('atz') ||
    sn.includes('etf')
  ) return 'ETF'

  // BDR — sufixo 34 / 35 / 33 ou nome inclui 'depositary' / 'bdr'
  if (
    tk.match(/\d{2}$/) && ['34','35','33'].includes(tk.slice(-2)) ||
    combined.includes('depositary') ||
    combined.includes('bdr')
  ) return 'BDR'

  // Renda Fixa / Tesouro
  if (
    combined.includes('tesouro') ||
    combined.includes('ntnb') ||
    combined.includes('lft') ||
    combined.includes('lci') ||
    combined.includes('lca') ||
    combined.includes('cdb') ||
    combined.includes('debenture')
  ) return 'BOND'

  // Cripto
  if (combined.includes('bitcoin') || combined.includes('ethereum') || combined.includes('crypto')) {
    return 'CRYPTO'
  }

  return 'STOCK'
}

function inferClassCode(assetType: string, ticker: string, quote: YahooQuote | null): string {
  const tk   = ticker.toUpperCase()
  const long = (quote?.longName ?? '').toLowerCase()

  switch (assetType) {
    case 'FII':    return 'FII'
    case 'BDR':    return 'BDR'
    case 'BOND':   return long.includes('tesouro') ? 'TREASURY' : 'FIXED_INCOME'
    case 'CRYPTO': return 'CRYPTO'
    case 'ETF':
      // ETF Internacional: longName contém 'exterior' ou 'international'
      return long.includes('exterior') || long.includes('international')
        ? 'INTERNATIONAL_ETF'
        : 'ETF'
    case 'STOCK':
    default:
      // Ação doméstica: padrão brasileiro 4 letras + 1-2 dígitos sem ser BDR
      return tk.match(/^[A-Z]{4}\d{1,2}$/) ? 'DOMESTIC_STOCK' : 'STOCK'
  }
}

export function NewTransactionDrawer({ open, onClose }: Props) {
  const [step, setStep]         = useState<Step>('type')
  const [txType, setTxType]     = useState<'BUY' | 'SELL'>('BUY')

  // Ativo
  const [tickerInput, setTickerInput]         = useState('')
  const [searchedTicker, setSearchedTicker]   = useState('')
  const [resolvedAsset, setResolvedAsset]     = useState<Asset | null>(null)
  const [yahooQuote, setYahooQuote]           = useState<YahooQuote | null>(null)
  const [searchLoading, setSearchLoading]     = useState(false)
  const [searchDone, setSearchDone]           = useState(false)

  // Dados para cadastro de novo ativo
  const [newAssetName, setNewAssetName]       = useState('')
  const [fallbackClassId, setFallbackClassId] = useState('')

  // Detalhes da transação
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().split('T')[0])
  const [quantity, setQuantity]   = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [fees, setFees]           = useState('0')
  const [submitError, setSubmitError] = useState('')

  const assetClasses = useAssetClasses()
  const assetQuery   = useAssetByTicker(searchedTicker)
  const createAsset  = useCreateAsset()
  const createTx     = useCreateTransaction()

  const grossAmount = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)
  const netAmount   = grossAmount + (parseFloat(fees) || 0)
  const isNewAsset  = searchDone && assetQuery.isFetched && assetQuery.data === null

  // Inferência dinâmica (recalcula sempre que ticker ou quote mudam)
  const inferredType      = inferAssetType(yahooQuote, searchedTicker)
  const inferredClassCode = inferClassCode(inferredType, searchedTicker, yahooQuote)
  const inferredClassId   = (assetClasses.data ?? []).find(
    (c: AssetClass) => c.code === inferredClassCode,
  )?.id ?? ''
  const inferredClassName = (assetClasses.data ?? []).find(
    (c: AssetClass) => c.code === inferredClassCode,
  )?.name ?? ''

  // Só pede seleção manual se o Yahoo não retornou nome E a inferência não tem classe
  const needsManualClass = isNewAsset && !inferredClassId
  const resolvedClassId  = inferredClassId || fallbackClassId

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('type'); setTickerInput(''); setSearchedTicker('')
        setResolvedAsset(null); setYahooQuote(null)
        setNewAssetName(''); setFallbackClassId('')
        setQuantity(''); setUnitPrice(''); setFees('0')
        setSubmitError(''); setSearchDone(false)
        setTradeDate(new Date().toISOString().split('T')[0])
      }, 300)
    }
  }, [open])

  // Quando asset é encontrado no banco local
  useEffect(() => {
    if (assetQuery.data) setResolvedAsset(assetQuery.data)
    else                 setResolvedAsset(null)
  }, [assetQuery.data])

  // Função principal de busca: banco local + Yahoo Finance em paralelo
  const runSearch = useCallback(async (ticker: string) => {
    setSearchLoading(true)
    setSearchDone(false)
    setYahooQuote(null)
    setNewAssetName('')
    setUnitPrice('')

    try {
      const yahoo = await fetchYahoo(ticker)
      setYahooQuote(yahoo)
      if (yahoo) {
        setNewAssetName(yahoo.longName || yahoo.shortName || ticker)
        if (yahoo.regularMarketPrice) {
          setUnitPrice(yahoo.regularMarketPrice.toFixed(2))
        }
      } else {
        setNewAssetName('')
      }
    } catch {
      setYahooQuote(null)
    } finally {
      setSearchLoading(false)
      setSearchDone(true)
    }
  }, [])

  const handleSearch = () => {
    const t = tickerInput.trim().toUpperCase()
    if (t.length < 2) return
    setSearchedTicker(t)
    runSearch(t)
  }

  const sortedClasses: AssetClass[] = (assetClasses.data ?? []).slice().sort(
    (a, b) => a.displayOrder - b.displayOrder,
  )

  const canProceedAsset = () => {
    if (!searchedTicker || !searchDone) return false
    if (searchLoading || assetQuery.isLoading) return false
    if (isNewAsset) return newAssetName.trim().length > 0 && resolvedClassId.length > 0
    return resolvedAsset !== null
  }

  const canProceedDetails = () =>
    tradeDate.length > 0 && parseFloat(quantity) > 0 && parseFloat(unitPrice) > 0

  const STEPS: Step[] = ['type', 'asset', 'details', 'confirm']
  const stepIndex = STEPS.indexOf(step)
  const stepLabel: Record<Step, string> = {
    type: 'Tipo de operação', asset: 'Ativo',
    details: 'Detalhes', confirm: 'Confirmar',
  }
  const isSubmitting = createAsset.isPending || createTx.isPending

  const handleNext = async () => {
    if (step === 'type')    { setStep('asset');   return }
    if (step === 'asset')   { setStep('details'); return }
    if (step === 'details') { setStep('confirm'); return }
    if (step === 'confirm') {
      setSubmitError('')
      try {
        let assetId = resolvedAsset?.id ?? ''
        if (isNewAsset) {
          const created = await createAsset.mutateAsync({
            ticker:       searchedTicker,
            name:         newAssetName,
            assetClassId: resolvedClassId,
            assetType:    inferredType,
            currencyCode: yahooQuote?.currency ?? 'BRL',
          })
          assetId = created.id
        }
        await createTx.mutateAsync({
          type:        txType,
          assetId,
          tradeDate,
          quantity:    parseFloat(quantity),
          unitPrice:   parseFloat(unitPrice),
          grossAmount,
          fees:        parseFloat(fees) || undefined,
          status:      'POSTED',
        })
        onClose()
      } catch {
        setSubmitError('Erro ao salvar. Verifique os dados e tente novamente.')
      }
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        fixed bottom-0 left-0 right-0 z-50
        sm:left-auto sm:right-4 sm:bottom-4 sm:w-[420px]
        bg-[var(--color-surface)] border border-[var(--color-border)]
        rounded-t-2xl sm:rounded-2xl shadow-2xl
        transform transition-transform duration-300 ease-out
        ${open ? 'translate-y-0' : 'translate-y-full sm:translate-y-[calc(100%+2rem)]'}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-subtle)]">
          <div>
            <p className="text-sm font-semibold">Novo Lançamento</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{stepLabel[step]}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-5 pt-3">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= stepIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
            }`} />
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-5 min-h-[280px]">

          {/* Step 1: Tipo */}
          {step === 'type' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Selecione o tipo de operação</p>
              {(['BUY', 'SELL'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxType(t)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all
                    ${txType === t
                      ? t === 'BUY'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-red-500 bg-red-500/10 text-red-400'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                    }
                  `}
                >
                  <span>{t === 'BUY' ? '↑ Compra (BUY)' : '↓ Venda (SELL)'}</span>
                  {txType === t && <CheckCircle2 size={16} />}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Ativo */}
          {step === 'asset' && (
            <div className="space-y-4">
              {/* Campo de busca */}
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Ticker</label>
                <div className="flex gap-2">
                  <input
                    value={tickerInput}
                    onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Ex: PETR4, MXRF11, AAPL"
                    maxLength={10}
                    className="flex-1 bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)]"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={tickerInput.trim().length < 2}
                    className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {(searchLoading || assetQuery.isLoading) ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Search size={15} />
                    )}
                  </button>
                </div>
              </div>

              {/* Ativo encontrado no banco */}
              {resolvedAsset && !isNewAsset && (
                <div className="flex items-start gap-3 px-3 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{resolvedAsset.ticker}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{resolvedAsset.name}</p>
                    <p className="text-xs text-[var(--color-text-faint)]">{resolvedAsset.assetClass?.name}</p>
                    {yahooQuote?.regularMarketPrice !== undefined && (
                      <p className="text-xs text-[var(--color-primary)] mt-1 flex items-center gap-1">
                        <Sparkles size={11} />
                        Cotação: {fmt.currency(yahooQuote.regularMarketPrice)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Ativo novo */}
              {isNewAsset && (
                <div className="space-y-3">
                  {/* Banner */}
                  <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg ${
                    yahooQuote?.longName
                      ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {yahooQuote?.longName ? (
                      <><Sparkles size={12} /> Encontrado no Yahoo Finance — confirme o nome</>
                    ) : (
                      <><AlertCircle size={12} /> Ativo não encontrado. Preencha o nome e a classe.</>
                    )}
                  </div>

                  {/* Nome — editável */}
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Nome do ativo *</label>
                    <input
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      placeholder="Ex: Maxi Renda FII"
                      className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)]"
                    />
                  </div>

                  {/* Classe: inferida (pill) ou manual (select) */}
                  {!needsManualClass ? (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--color-surface-offset)] rounded-lg">
                      <span className="text-xs text-[var(--color-text-muted)]">Classe inferida</span>
                      <span className="text-xs font-medium text-[var(--color-text)]">{inferredClassName}</span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Classe de ativo *</label>
                      <select
                        value={fallbackClassId}
                        onChange={(e) => setFallbackClassId(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                        className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="">Selecione a classe</option>
                        {sortedClasses.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Preço sugerido */}
                  {yahooQuote?.regularMarketPrice && (
                    <p className="text-xs text-[var(--color-text-faint)] flex items-center gap-1">
                      <Sparkles size={11} className="text-[var(--color-primary)]" />
                      Preço sugerido (Yahoo Finance): {fmt.currency(yahooQuote.regularMarketPrice)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Detalhes */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Data do negócio</label>
                <input
                  type="date" value={tradeDate}
                  onChange={(e) => setTradeDate(e.target.value)}
                  className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Quantidade</label>
                  <input
                    type="number" min="0" step="1" value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                    Preço unitário
                    {yahooQuote?.regularMarketPrice && (
                      <span className="ml-1 text-[var(--color-primary)] text-[10px]">Yahoo ✓</span>
                    )}
                  </label>
                  <input
                    type="number" min="0" step="0.01" value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)] tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Taxas / Corretagem (R$)</label>
                <input
                  type="number" min="0" step="0.01" value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] tabular-nums"
                />
              </div>
              {grossAmount > 0 && (
                <div className="px-4 py-3 bg-[var(--color-surface-offset)] rounded-xl">
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
                    <span>Valor bruto</span>
                    <span className="tabular-nums">{fmt.currency(grossAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span className={`tabular-nums ${
                      txType === 'BUY' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {txType === 'BUY' ? '-' : '+'}{fmt.currency(netAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmar */}
          {step === 'confirm' && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Revise os dados antes de confirmar</p>
              {[
                { label: 'Operação',    value: txType === 'BUY' ? '↑ Compra' : '↓ Venda'                  },
                { label: 'Ativo',       value: `${searchedTicker} — ${resolvedAsset?.name ?? newAssetName}` },
                { label: 'Classe',      value: resolvedAsset?.assetClass?.name ?? inferredClassName         },
                { label: 'Data',        value: fmt.date(tradeDate)                                          },
                { label: 'Quantidade',  value: fmt.number(parseFloat(quantity) || 0, 0)                    },
                { label: 'Preço unit.', value: fmt.currency(parseFloat(unitPrice) || 0)                    },
                { label: 'Taxas',       value: fmt.currency(parseFloat(fees) || 0)                         },
                { label: 'Total',       value: fmt.currency(netAmount)                                     },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">{label}</span>
                  <span className="font-medium tabular-nums text-right max-w-[60%] truncate">{value}</span>
                </div>
              ))}
              {submitError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5 pt-1">
                  <AlertCircle size={13} />{submitError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          {step !== 'type' && (
            <button
              onClick={() => setStep(STEPS[stepIndex - 1])}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-offset)] transition-colors disabled:opacity-40"
            >
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={
              (step === 'asset' && !canProceedAsset()) ||
              (step === 'details' && !canProceedDetails()) ||
              isSubmitting
            }
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <><Loader2 size={15} className="animate-spin" /> Salvando...</>
            ) : step === 'confirm' ? 'Confirmar' : (
              <>Próximo <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
