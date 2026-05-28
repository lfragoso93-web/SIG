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
  type BrapiQuote,
} from '@/lib/hooks/useTransactions'

type Step = 'type' | 'asset' | 'details' | 'confirm'

interface Props {
  open: boolean
  onClose: () => void
}

// ── Inferência automática ──────────────────────────────────────────────────

/** AssetType (enum Prisma) inferido pelo ticker + dados brapi */
function inferAssetType(quote: BrapiQuote | null, ticker: string): string {
  const tk   = ticker.toUpperCase()
  const name = ((quote?.longName ?? quote?.shortName) || '').toLowerCase()
  const type = (quote?.type ?? '').toUpperCase()

  if (type === 'ETF' || name.includes(' etf')) return 'ETF'
  if (type === 'FII' || name.includes('fundo imobili'))  return 'FII'
  if (tk.endsWith('34') || tk.endsWith('35') || name.includes('bdr')) return 'BDR'
  if (name.includes('tesouro') || name.includes('ntnb') || name.includes('lft')) return 'BOND'
  if (type === 'STOCK' || tk.match(/^[A-Z]{4}\d{1,2}$/)) return 'STOCK'
  return 'STOCK'
}

/**
 * AssetClass.code inferido pelo assetType + ticker.
 * Retorna o code que baterá com a tabela AssetClass.
 */
function inferClassCode(assetType: string, ticker: string): string {
  const tk = ticker.toUpperCase()
  switch (assetType) {
    case 'ETF':    return tk.endsWith('11') ? 'ETF' : 'INTERNATIONAL_ETF'
    case 'FII':    return 'FII'
    case 'BDR':    return 'BDR'
    case 'BOND':   return 'FIXED_INCOME'
    case 'CRYPTO': return 'CRYPTO'
    case 'STOCK':
    default:
      // tickers com 4 letras + número sem sufixo internacional → doméstico
      return tk.match(/^[A-Z]{4}\d{1,2}$/) ? 'DOMESTIC_STOCK' : 'STOCK'
  }
}

export function NewTransactionDrawer({ open, onClose }: Props) {
  const [step, setStep]         = useState<Step>('type')
  const [txType, setTxType]     = useState<'BUY' | 'SELL'>('BUY')

  // Ativo
  const [tickerInput, setTickerInput]       = useState('')
  const [searchedTicker, setSearchedTicker] = useState('')
  const [resolvedAsset, setResolvedAsset]   = useState<Asset | null>(null)
  const [brapiQuote, setBrapiQuote]         = useState<BrapiQuote | null>(null)
  const [brapiLoading, setBrapiLoading]     = useState(false)

  // Dados inferidos (editáveis como fallback)
  const [newAssetName, setNewAssetName]   = useState('')
  const [fallbackClassId, setFallbackClassId] = useState('')  // só usado se inferência falhar

  // Detalhes
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
  const isNewAsset  = searchedTicker.length >= 2 && assetQuery.isFetched && assetQuery.data === null

  // Inferidos a partir do ticker + brapi
  const inferredType      = inferAssetType(brapiQuote, searchedTicker)
  const inferredClassCode = inferClassCode(inferredType, searchedTicker)
  const inferredClassId   = (assetClasses.data ?? []).find(
    (c: AssetClass) => c.code === inferredClassCode,
  )?.id ?? ''

  // Se a inferência não encontrar a classe, usa o fallback manual
  const resolvedClassId = inferredClassId || fallbackClassId
  // Só precisa do select manual se a inferência falhou
  const needsManualClass = isNewAsset && !inferredClassId

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('type'); setTickerInput(''); setSearchedTicker('')
        setResolvedAsset(null); setBrapiQuote(null)
        setNewAssetName(''); setFallbackClassId('')
        setQuantity(''); setUnitPrice(''); setFees('0'); setSubmitError('')
        setTradeDate(new Date().toISOString().split('T')[0])
      }, 300)
    }
  }, [open])

  // Quando asset é encontrado no banco
  useEffect(() => {
    if (assetQuery.data) setResolvedAsset(assetQuery.data)
    else                 setResolvedAsset(null)
  }, [assetQuery.data])

  // Consulta brapi ao mudar o ticker buscado
  const fetchBrapi = useCallback(async (ticker: string) => {
    if (ticker.length < 2) return
    setBrapiLoading(true)
    try {
      const res = await fetch(
        `https://brapi.dev/api/quote/${ticker}?fundamental=true`,
        { signal: AbortSignal.timeout(6000) },
      )
      if (!res.ok) { setBrapiQuote(null); return }
      const json  = await res.json()
      const result: BrapiQuote | undefined = json?.results?.[0]
      if (!result) { setBrapiQuote(null); return }
      setBrapiQuote(result)
      // Pré-preenche nome e preço
      setNewAssetName(result.longName || result.shortName || ticker)
      if (result.regularMarketPrice) {
        setUnitPrice(result.regularMarketPrice.toFixed(2))
      }
    } catch {
      setBrapiQuote(null)
    } finally {
      setBrapiLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchedTicker.length >= 2) fetchBrapi(searchedTicker)
  }, [searchedTicker, fetchBrapi])

  const handleSearch = () => {
    const t = tickerInput.trim().toUpperCase()
    if (t.length < 2) return
    setSearchedTicker(t)
    setBrapiQuote(null)
  }

  const sortedClasses: AssetClass[] = (assetClasses.data ?? []).slice().sort(
    (a, b) => a.displayOrder - b.displayOrder,
  )

  const canProceedAsset = () => {
    if (!searchedTicker) return false
    if (assetQuery.isLoading || brapiLoading) return false
    if (isNewAsset) return newAssetName.trim().length > 0 && resolvedClassId.length > 0
    return resolvedAsset !== null
  }

  const canProceedDetails = () =>
    tradeDate.length > 0 && parseFloat(quantity) > 0 && parseFloat(unitPrice) > 0

  const STEPS: Step[] = ['type', 'asset', 'details', 'confirm']
  const stepIndex = STEPS.indexOf(step)

  const stepLabel: Record<Step, string> = {
    type:    'Tipo de operação',
    asset:   'Ativo',
    details: 'Detalhes',
    confirm: 'Confirmar',
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
            currencyCode: 'BRL',
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

  const brapiName = brapiQuote?.longName || brapiQuote?.shortName

  // Label legível da classe inferida
  const inferredClassName = (assetClasses.data ?? []).find(
    (c: AssetClass) => c.code === inferredClassCode,
  )?.name ?? inferredClassCode

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
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= stepIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-5 min-h-[260px]">

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
                    placeholder="Ex: PETR4"
                    maxLength={10}
                    className="flex-1 bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)]"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={tickerInput.trim().length < 2}
                    className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {(assetQuery.isLoading || brapiLoading) ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Search size={15} />
                    )}
                  </button>
                </div>
              </div>

              {/* Ativo encontrado no banco */}
              {resolvedAsset && (
                <div className="flex items-start gap-3 px-3 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{resolvedAsset.ticker}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{resolvedAsset.name}</p>
                    <p className="text-xs text-[var(--color-text-faint)]">{resolvedAsset.assetClass?.name}</p>
                    {brapiQuote?.regularMarketPrice !== undefined && (
                      <p className="text-xs text-[var(--color-primary)] mt-1 flex items-center gap-1">
                        <Sparkles size={11} />
                        Cotação atual: {fmt.currency(brapiQuote.regularMarketPrice)}
                        {brapiQuote.regularMarketChangePercent !== undefined && (
                          <span className={brapiQuote.regularMarketChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            ({brapiQuote.regularMarketChangePercent >= 0 ? '+' : ''}{brapiQuote.regularMarketChangePercent.toFixed(2)}%)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Ativo novo — pré-preenchido pela brapi */}
              {isNewAsset && (
                <div className="space-y-3">
                  {/* Banner de status */}
                  <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg ${
                    brapiName
                      ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {brapiName ? (
                      <><Sparkles size={12} /> Encontrado na brapi — confirme o nome abaixo</>
                    ) : (
                      <><AlertCircle size={12} /> Ativo não reconhecido. Informe o nome.</>                      
                    )}
                  </div>

                  {/* Nome — editável */}
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Nome do ativo *</label>
                    <input
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      placeholder="Ex: Petrobras S.A."
                      className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)]"
                    />
                  </div>

                  {/* Classe inferida — apenas informativo, ou select se falhar */}
                  {!needsManualClass ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-surface-offset)] rounded-lg">
                      <span className="text-xs text-[var(--color-text-muted)]">Classe inferida</span>
                      <span className="text-xs font-medium">{inferredClassName}</span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Classe de ativo *</label>
                      <select
                        value={fallbackClassId}
                        onChange={(e) => setFallbackClassId(e.target.value)}
                        className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="" className="bg-[var(--color-surface)] text-[var(--color-text)]">Selecione</option>
                        {sortedClasses.map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            className="bg-[var(--color-surface)] text-[var(--color-text)]"
                          >
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Preço sugerido pela brapi */}
                  {brapiQuote?.regularMarketPrice && (
                    <p className="text-xs text-[var(--color-text-faint)] flex items-center gap-1">
                      <Sparkles size={11} className="text-[var(--color-primary)]" />
                      Preço sugerido (brapi): {fmt.currency(brapiQuote.regularMarketPrice)}
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
                  type="date"
                  value={tradeDate}
                  onChange={(e) => setTradeDate(e.target.value)}
                  className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Quantidade</label>
                  <input
                    type="number" min="0" step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                    Preço unitário (R$)
                    {brapiQuote?.regularMarketPrice && (
                      <span className="ml-1 text-[var(--color-primary)] text-[10px]">brapi ✓</span>
                    )}
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)] tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Taxas / Corretagem (R$)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={fees}
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
                { label: 'Operação',    value: txType === 'BUY' ? '↑ Compra' : '↓ Venda'               },
                { label: 'Ativo',       value: `${searchedTicker} — ${resolvedAsset?.name ?? newAssetName}` },
                { label: 'Classe',      value: resolvedAsset?.assetClass?.name ?? inferredClassName      },
                { label: 'Data',        value: fmt.date(tradeDate)                                       },
                { label: 'Quantidade',  value: fmt.number(parseFloat(quantity) || 0, 0)                 },
                { label: 'Preço unit.', value: fmt.currency(parseFloat(unitPrice) || 0)                 },
                { label: 'Taxas',       value: fmt.currency(parseFloat(fees) || 0)                      },
                { label: 'Total',       value: fmt.currency(netAmount)                                  },
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
            ) : step === 'confirm' ? (
              'Confirmar'
            ) : (
              <>Próximo <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
