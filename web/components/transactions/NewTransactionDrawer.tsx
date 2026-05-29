'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Search, ChevronRight, CheckCircle2, Loader2,
  AlertCircle, Sparkles, TrendingUp, TrendingDown,
} from 'lucide-react'
import { fmt } from '@/lib/utils'
import { api } from '@/lib/api'
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

interface BackendQuote {
  name:          string | null
  inferredClass: string | null
  symbol?:       string
  quoteType?:    string
  exchDisp?:     string
}

async function fetchQuoteFromBackend(ticker: string): Promise<BackendQuote | null> {
  try {
    const res = await api.get<BackendQuote>(`/assets/quote/${encodeURIComponent(ticker)}`)
    return res.data
  } catch {
    return null
  }
}

/**
 * Busca o ativo diretamente na API (sem cache do React Query).
 * Retorna null se 404, lança em outros erros.
 */
async function fetchAssetByTickerDirect(ticker: string): Promise<Asset | null> {
  try {
    const { data } = await api.get<Asset>(`/assets/ticker/${ticker.toUpperCase()}`)
    return data
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } }
    if (err?.response?.status === 404) return null
    throw e
  }
}

// Mapa: nome da classe (como vem do banco) → assetType
const CLASS_NAME_TO_ASSET_TYPE: Record<string, string> = {
  'Fundo Imobiliário':    'FII',
  'ETF Nacional':         'ETF',
  'ETF Internacional':    'ETF',
  'Ação Nacional':        'STOCK',
  'Ação Internacional':   'STOCK',
  'BDR':                  'BDR',
  'Renda Fixa':           'BOND',
  'Tesouro Direto':       'BOND',
  'Criptoativo':          'CRYPTO',
  'Fundo':                'FUND',
  'Caixa':                'CASH',
}

// Extrai mensagem legível de erros Axios/API
function extractErrorMessage(error: unknown): string {
  if (!error) return 'Erro desconhecido.'
  const err = error as {
    response?: { data?: { message?: string; error?: string }; status?: number }
    message?: string
  }
  const data = err?.response?.data
  if (data?.message) return data.message
  if (data?.error)   return data.error
  if (err?.message)  return err.message
  return 'Erro ao salvar. Tente novamente.'
}

export function NewTransactionDrawer({ open, onClose }: Props) {
  const [step, setStep]     = useState<Step>('type')
  const [txType, setTxType] = useState<'BUY' | 'SELL'>('BUY')

  const [tickerInput, setTickerInput]       = useState('')
  const [searchedTicker, setSearchedTicker] = useState('')
  const [resolvedAsset, setResolvedAsset]   = useState<Asset | null>(null)
  const [backendQuote, setBackendQuote]     = useState<BackendQuote | null>(null)
  const [searchLoading, setSearchLoading]   = useState(false)
  const [searchDone, setSearchDone]         = useState(false)

  const [newAssetName, setNewAssetName]       = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')

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

  const selectedClassName = (assetClasses.data ?? []).find(
    (c: AssetClass) => c.id === selectedClassId,
  )?.name ?? ''
  const inferredAssetType = CLASS_NAME_TO_ASSET_TYPE[selectedClassName] ?? 'OTHER'

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('type'); setTickerInput(''); setSearchedTicker('')
        setResolvedAsset(null); setBackendQuote(null)
        setNewAssetName(''); setSelectedClassId('')
        setQuantity(''); setUnitPrice(''); setFees('0')
        setSubmitError(''); setSearchDone(false)
        setTradeDate(new Date().toISOString().split('T')[0])
      }, 300)
    }
  }, [open])

  useEffect(() => {
    if (assetQuery.data) setResolvedAsset(assetQuery.data)
    else                 setResolvedAsset(null)
  }, [assetQuery.data])

  const runSearch = useCallback(async (ticker: string) => {
    setSearchLoading(true)
    setSearchDone(false)
    setBackendQuote(null)
    setNewAssetName('')
    setSelectedClassId('')
    setUnitPrice('')
    try {
      const quote = await fetchQuoteFromBackend(ticker)
      setBackendQuote(quote)
      if (quote?.name) setNewAssetName(quote.name)
      if (quote?.inferredClass) {
        const matched = (assetClasses.data ?? []).find(
          (c: AssetClass) => c.name === quote.inferredClass,
        )
        if (matched) setSelectedClassId(matched.id)
      }
    } catch {
      setBackendQuote(null)
    } finally {
      setSearchLoading(false)
      setSearchDone(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetClasses.data])

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
    if (isNewAsset) return newAssetName.trim().length > 0 && selectedClassId.length > 0
    return resolvedAsset !== null
  }

  const canProceedDetails = () =>
    tradeDate.length > 0 && parseFloat(quantity) > 0 && parseFloat(unitPrice) > 0

  const STEPS: Step[] = ['type', 'asset', 'details', 'confirm']
  const stepIndex = STEPS.indexOf(step)
  const isSubmitting = createAsset.isPending || createTx.isPending

  const stepConfig = {
    type:    { label: 'Tipo de operação', step: 1 },
    asset:   { label: 'Ativo',              step: 2 },
    details: { label: 'Detalhes',           step: 3 },
    confirm: { label: 'Confirmar',          step: 4 },
  }

  const handleNext = async () => {
    if (step === 'type')    { setStep('asset');   return }
    if (step === 'asset')   { setStep('details'); return }
    if (step === 'details') { setStep('confirm'); return }
    if (step === 'confirm') {
      setSubmitError('')
      try {
        let assetId = resolvedAsset?.id ?? ''

        if (isNewAsset) {
          // Busca direta (sem cache) para garantir que o ativo realmente não existe.
          // Isso evita criar um duplicado quando o React Query serviu null por cache stale.
          const existingAsset = await fetchAssetByTickerDirect(searchedTicker)

          if (existingAsset) {
            // Ativo já existe: aproveita o id encontrado, sem criar
            assetId = existingAsset.id
            setResolvedAsset(existingAsset)
          } else {
            const created = await createAsset.mutateAsync({
              ticker:       searchedTicker,
              name:         newAssetName,
              assetClassId: selectedClassId,
              assetType:    inferredAssetType,
              currencyCode: 'BRL',
            })
            assetId = created.id
          }
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
      } catch (err) {
        setSubmitError(extractErrorMessage(err))
      }
    }
  }

  // ── Estilos reutilizáveis ─────────────────────────────────────────────────
  const inputClass = [
    'w-full rounded-lg px-3 py-2 text-sm',
    'bg-[var(--color-surface-offset)] border border-[var(--color-border)]',
    'placeholder:text-[var(--color-text-faint)] text-[var(--color-text)]',
    'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
    'transition-all duration-150',
  ].join(' ')

  const labelClass = 'block text-xs font-medium text-[var(--color-text-muted)] mb-1.5'

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        fixed bottom-0 left-0 right-0 z-50
        sm:left-auto sm:right-4 sm:bottom-4 sm:w-[400px]
        flex flex-col
        bg-[var(--color-surface)] border border-[var(--color-border)]
        rounded-t-2xl sm:rounded-2xl
        shadow-[0_-8px_40px_oklch(0_0_0/0.3)]
        transform transition-transform duration-300 ease-out
        ${open ? 'translate-y-0' : 'translate-y-full sm:translate-y-[calc(100%+2rem)]'}
      `}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              txType === 'BUY'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}>
              {txType === 'BUY'
                ? <TrendingUp size={15} strokeWidth={2.5} />
                : <TrendingDown size={15} strokeWidth={2.5} />}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Novo Lançamento</p>
              <p className="text-xs text-[var(--color-text-muted)] leading-tight mt-0.5">
                {stepConfig[step].label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-faint)]">
              {stepConfig[step].step}/4
            </span>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition-all"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-5 pb-4">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-0.5 flex-1 rounded-full transition-all duration-400 ${
                i < stepIndex
                  ? 'bg-[var(--color-primary)]'
                  : i === stepIndex
                    ? txType === 'BUY' ? 'bg-emerald-400' : 'bg-red-400'
                    : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {/* Divisor */}
        <div className="h-px bg-[var(--color-border)] mx-5" />

        {/* Body */}
        <div className="px-5 py-5 flex-1 min-h-[260px]">

          {/* Step 1: Tipo */}
          {step === 'type' && (
            <div className="space-y-2.5">
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Selecione o tipo de operação</p>
              {(['BUY', 'SELL'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxType(t)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl
                    border text-sm font-medium transition-all duration-150
                    ${
                      txType === t
                        ? t === 'BUY'
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                          : 'border-red-500/60 bg-red-500/10 text-red-400'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary-highlight)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      txType === t
                        ? t === 'BUY' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        : 'bg-[var(--color-surface-offset)]'
                    }`}>
                      {t === 'BUY'
                        ? <TrendingUp size={13} />
                        : <TrendingDown size={13} />}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{t === 'BUY' ? 'Compra' : 'Venda'}</p>
                      <p className="text-xs opacity-70">{t === 'BUY' ? 'Adquirir ativo' : 'Desfazer posição'}</p>
                    </div>
                  </div>
                  {txType === t && <CheckCircle2 size={15} />}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Ativo */}
          {step === 'asset' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Ticker</label>
                <div className="flex gap-2">
                  <input
                    value={tickerInput}
                    onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Ex: PETR4, MXRF11"
                    maxLength={30}
                    className={inputClass}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={tickerInput.trim().length < 2}
                    className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {(searchLoading || assetQuery.isLoading)
                      ? <Loader2 size={15} className="animate-spin" />
                      : <Search size={15} />}
                  </button>
                </div>
              </div>

              {resolvedAsset && !isNewAsset && (
                <div className="flex items-center gap-3 px-3.5 py-3 bg-emerald-500/8 border border-emerald-500/25 rounded-xl">
                  <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight">{resolvedAsset.ticker}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                      {resolvedAsset.name}
                      {resolvedAsset.assetClass?.name && (
                        <span className="text-[var(--color-text-faint)]"> · {resolvedAsset.assetClass.name}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {isNewAsset && (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                    backendQuote?.name
                      ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {backendQuote?.name
                      ? <><Sparkles size={11} /> <span>Nome sugerido — confirme os dados</span></>
                      : <><AlertCircle size={11} /> <span>Ativo não encontrado. Preencha manualmente.</span></>}
                  </div>
                  <div>
                    <label className={labelClass}>Nome do ativo *</label>
                    <input value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)}
                      placeholder="Ex: Maxi Renda FII" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Classe de ativo *
                      {selectedClassId && backendQuote?.inferredClass && (
                        <span className="ml-1.5 text-[var(--color-primary)] font-normal opacity-70">(sugerida)</span>
                      )}
                    </label>
                    <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className={inputClass}>
                      <option value="">Selecione a classe</option>
                      {sortedClasses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Detalhes */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Data do negócio</label>
                <input type="date" value={tradeDate}
                  onChange={(e) => setTradeDate(e.target.value)}
                  className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Quantidade</label>
                  <input type="number" min="0" step="1" value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0" className={`${inputClass} tabular-nums`} />
                </div>
                <div>
                  <label className={labelClass}>Preço unitário</label>
                  <input type="number" min="0" step="0.01" value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0,00" className={`${inputClass} tabular-nums`} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Taxas (R$)</label>
                <input type="number" min="0" step="0.01" value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  className={`${inputClass} tabular-nums`} />
              </div>

              {grossAmount > 0 && (
                <div className="bg-[var(--color-surface-offset)] rounded-xl p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-muted)]">Valor bruto</span>
                    <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{fmt.currency(grossAmount)}</span>
                  </div>
                  {parseFloat(fees) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[var(--color-text-muted)]">Taxas</span>
                      <span className="text-xs tabular-nums text-[var(--color-text-muted)]">{fmt.currency(parseFloat(fees))}</span>
                    </div>
                  )}
                  <div className="h-px bg-[var(--color-border)] my-1" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Total</span>
                    <span className={`text-sm font-semibold tabular-nums ${
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
            <div className="space-y-1">
              <p className="text-xs text-[var(--color-text-muted)] mb-3">Revise os dados antes de confirmar</p>

              <div className="bg-[var(--color-surface-offset)] rounded-xl divide-y divide-[var(--color-border)]">
                {[
                  { label: 'Operação',    value: txType === 'BUY' ? 'Compra'   : 'Venda',
                    accent: txType === 'BUY' ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Ativo',       value: searchedTicker,                  accent: 'font-semibold' },
                  { label: 'Nome',        value: resolvedAsset?.name ?? newAssetName,  accent: '' },
                  { label: 'Classe',      value: resolvedAsset?.assetClass?.name ?? selectedClassName, accent: '' },
                  { label: 'Data',        value: fmt.date(tradeDate),             accent: '' },
                  { label: 'Quantidade',  value: fmt.number(parseFloat(quantity) || 0, 0), accent: 'tabular-nums' },
                  { label: 'Preço unit.', value: fmt.currency(parseFloat(unitPrice) || 0), accent: 'tabular-nums' },
                  { label: 'Taxas',       value: fmt.currency(parseFloat(fees) || 0),     accent: 'tabular-nums' },
                  { label: 'Total',       value: fmt.currency(netAmount),
                    accent: `tabular-nums font-semibold ${txType === 'BUY' ? 'text-red-400' : 'text-emerald-400'}` },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="flex justify-between items-center px-3.5 py-2.5">
                    <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                    <span className={`text-xs text-right max-w-[58%] truncate ${accent}`}>{value}</span>
                  </div>
                ))}
              </div>

              {submitError && (
                <div className="flex items-start gap-2 px-3 py-2.5 mt-3 bg-red-500/10 border border-red-500/25 rounded-lg">
                  <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 leading-relaxed">{submitError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-px bg-[var(--color-border)] mx-5" />
        <div className="px-5 py-4 flex gap-2.5">
          {step !== 'type' && (
            <button
              onClick={() => setStep(STEPS[stepIndex - 1])}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition-all disabled:opacity-40"
            >
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={
              (step === 'asset'   && !canProceedAsset())   ||
              (step === 'details' && !canProceedDetails()) ||
              isSubmitting
            }
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              step === 'confirm'
                ? txType === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'
            }`}
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Salvando...</>
            ) : step === 'confirm' ? (
              <>{txType === 'BUY' ? 'Confirmar Compra' : 'Confirmar Venda'}</>
            ) : (
              <>Próximo <ChevronRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
