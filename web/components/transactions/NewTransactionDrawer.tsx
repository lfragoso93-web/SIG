'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, CheckCircle2, Loader2, AlertCircle, Sparkles,
  TrendingUp, TrendingDown, Search,
} from 'lucide-react'
import { fmt } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  useAssetClasses,
  useCreateAsset,
  useCreateTransaction,
  type Asset,
  type AssetClass,
} from '@/lib/hooks/useTransactions'

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

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchQuoteFromBackend(ticker: string): Promise<BackendQuote | null> {
  try {
    const res = await api.get<BackendQuote>(`/assets/quote/${encodeURIComponent(ticker)}`)
    return res.data
  } catch {
    return null
  }
}

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

async function searchLocalAssets(query: string): Promise<Asset[]> {
  if (query.length < 2) return []
  try {
    const { data } = await api.get<Asset[]>(`/assets`, {
      params: { search: query, limit: 10 },
    })
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

const CLASS_NAME_TO_ASSET_TYPE: Record<string, string> = {
  'Fundo Imobiliário':  'FII',
  'ETF Nacional':       'ETF',
  'ETF Internacional':  'ETF',
  'Ação Nacional':      'STOCK',
  'Ação Internacional': 'STOCK',
  'BDR':                'BDR',
  'Renda Fixa':         'BOND',
  'Tesouro Direto':     'BOND',
  'Criptoativo':        'CRYPTO',
  'Fundo':              'FUND',
  'Caixa':              'CASH',
}

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

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--color-primary)]/25 text-[var(--color-primary)] rounded-sm px-0.5 font-semibold not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ── AssetCombobox ─────────────────────────────────────────────────────────────
interface AssetComboboxProps {
  value: string
  onChange: (raw: string) => void
  onSelect: (asset: Asset) => void
  onTriggerRemoteSearch: (ticker: string) => void
  inputClass: string
  disabled?: boolean
}

function AssetCombobox({
  value, onChange, onSelect, onTriggerRemoteSearch, inputClass, disabled,
}: AssetComboboxProps) {
  const [suggestions, setSuggestions] = useState<Asset[]>([])
  const [loading, setLoading]         = useState(false)
  const [open, setOpen]               = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef      = useRef<HTMLUListElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 2) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await searchLocalAssets(value)
      setSuggestions(results)
      setOpen(results.length > 0)
      setActiveIdx(-1)
      setLoading(false)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value])

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && e.key !== 'Enter') return
    if (e.key === 'ArrowDown')      { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Escape')    { setOpen(false); setActiveIdx(-1) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && activeIdx >= 0 && suggestions[activeIdx]) {
        handleSelect(suggestions[activeIdx])
      } else {
        const t = value.trim().toUpperCase()
        if (t.length >= 2) { setOpen(false); onTriggerRemoteSearch(t) }
      }
    }
  }

  function handleSelect(asset: Asset) {
    setOpen(false); setSuggestions([]); onSelect(asset)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value.toUpperCase()); setOpen(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Ex: PETR4, MXRF11, BTC…"
          maxLength={30}
          disabled={disabled}
          className={`${inputClass} pr-9`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </span>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_24px_oklch(0_0_0/0.35)] divide-y divide-[var(--color-border)]"
        >
          {suggestions.map((asset, i) => (
            <li
              key={asset.id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(asset) }}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                i === activeIdx ? 'bg-[var(--color-primary)]/12' : 'hover:bg-[var(--color-surface-offset)]'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  <Highlight text={asset.ticker} query={value} />
                </p>
                {asset.name && (
                  <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                    <Highlight text={asset.name} query={value} />
                  </p>
                )}
              </div>
              {asset.assetClass?.name && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--color-surface-offset)] text-[var(--color-text-faint)] flex-shrink-0 whitespace-nowrap">
                  {asset.assetClass.name}
                </span>
              )}
            </li>
          ))}
          <li
            role="option"
            onMouseDown={(e) => {
              e.preventDefault()
              const t = value.trim().toUpperCase()
              if (t.length >= 2) { setOpen(false); onTriggerRemoteSearch(t) }
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 cursor-pointer text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-colors"
          >
            <Search size={11} />
            Buscar &ldquo;{value}&rdquo; no mercado
          </li>
        </ul>
      )}
    </div>
  )
}

// ── ClassSelect (reutilizável) ─────────────────────────────────────────────────────
function ClassSelect({
  value, onChange, classes, selectClass, labelClass, showSuggested,
}: {
  value: string
  onChange: (v: string) => void
  classes: AssetClass[]
  selectClass: string
  labelClass: string
  showSuggested?: boolean
}) {
  return (
    <div>
      <label className={labelClass}>
        Classe de ativo
        {showSuggested && (
          <span className="ml-1.5 text-[var(--color-primary)] font-normal opacity-70">(sugerida)</span>
        )}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            colorScheme: 'dark',
            color: 'var(--color-text)',
            backgroundColor: 'var(--color-surface-offset)',
          }}
          className={selectClass}
        >
          <option value="" style={{ color: 'var(--color-text-faint)', backgroundColor: 'var(--color-surface-offset)' }}>
            Selecione a classe
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id} style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-surface-offset)' }}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </div>
  )
}

// ── Drawer principal ──────────────────────────────────────────────────────────
export function NewTransactionDrawer({ open, onClose }: Props) {
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
  const createAsset  = useCreateAsset()
  const createTx     = useCreateTransaction()

  const classesLoading = assetClasses.isLoading || (!assetClasses.data && !assetClasses.isError)
  const isSubmitting   = createAsset.isPending || createTx.isPending

  const grossAmount = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)
  const netAmount   = grossAmount + (parseFloat(fees) || 0)
  const isNewAsset  = searchDone && !resolvedAsset

  const selectedClassName = (assetClasses.data ?? []).find(
    (c: AssetClass) => c.id === selectedClassId,
  )?.name ?? ''
  const inferredAssetType = CLASS_NAME_TO_ASSET_TYPE[selectedClassName] ?? 'OTHER'

  const sortedClasses: AssetClass[] = (assetClasses.data ?? []).slice().sort(
    (a, b) => a.displayOrder - b.displayOrder,
  )

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setTxType('BUY')
        setTickerInput(''); setSearchedTicker('')
        setResolvedAsset(null); setBackendQuote(null)
        setNewAssetName(''); setSelectedClassId('')
        setQuantity(''); setUnitPrice(''); setFees('0')
        setSubmitError(''); setSearchDone(false)
        setTradeDate(new Date().toISOString().split('T')[0])
      }, 300)
    }
  }, [open])

  /** Seleciona ativo local — preenche classe automaticamente */
  const handleSelectLocalAsset = useCallback((asset: Asset) => {
    setTickerInput(asset.ticker)
    setSearchedTicker(asset.ticker)
    setResolvedAsset(asset)
    setSearchDone(true)
    setBackendQuote(null)
    setNewAssetName('')
    // Preenche classe com a do ativo selecionado
    setSelectedClassId(asset.assetClassId ?? asset.assetClass?.id ?? '')
  }, [])

  /** Busca remota — tenta banco direto, depois quote do mercado */
  const handleTriggerRemoteSearch = useCallback(async (ticker: string) => {
    setSearchedTicker(ticker)
    setTickerInput(ticker)
    setResolvedAsset(null)
    setSearchDone(false)
    setSearchLoading(true)
    setBackendQuote(null)
    setNewAssetName('')
    setSelectedClassId('')
    try {
      const existing = await fetchAssetByTickerDirect(ticker)
      if (existing) {
        setResolvedAsset(existing)
        setSelectedClassId(existing.assetClassId ?? existing.assetClass?.id ?? '')
        setSearchDone(true)
        setSearchLoading(false)
        return
      }
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
      setSearchDone(true)
      setSearchLoading(false)
    }
  }, [assetClasses.data])

  const canSubmit = () => {
    if (!searchedTicker || !searchDone || searchLoading) return false
    if (!resolvedAsset && !isNewAsset) return false
    if (isNewAsset && newAssetName.trim().length === 0) return false
    if (!selectedClassId) return false  // obrigatório sempre
    if (!tradeDate || parseFloat(quantity) <= 0 || parseFloat(unitPrice) <= 0) return false
    return true
  }

  const handleSubmit = async () => {
    setSubmitError('')
    try {
      let assetId = resolvedAsset?.id ?? ''
      if (isNewAsset) {
        const existingAsset = await fetchAssetByTickerDirect(searchedTicker)
        if (existingAsset) {
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
        type:      txType,
        assetId,
        tradeDate,
        quantity:  parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        grossAmount,
        fees:      parseFloat(fees) || undefined,
        status:    'POSTED',
      })
      onClose()
    } catch (err) {
      setSubmitError(extractErrorMessage(err))
    }
  }

  const inputBase = [
    'w-full rounded-lg px-3 py-2 text-sm',
    'bg-[var(--color-surface-offset)] border border-[var(--color-border)]',
    'text-[var(--color-text)]',
    'placeholder:text-[var(--color-text-faint)]',
    'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
    'transition-all duration-150',
  ].join(' ')

  const selectClass = `${inputBase} appearance-none`
  const labelClass  = 'block text-xs font-medium text-[var(--color-text-muted)] mb-1.5'
  const isBuy = txType === 'BUY'

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
        sm:left-auto sm:right-4 sm:bottom-4 sm:w-[420px]
        flex flex-col max-h-[92dvh]
        bg-[var(--color-surface)] border border-[var(--color-border)]
        rounded-t-2xl sm:rounded-2xl
        shadow-[0_-8px_40px_oklch(0_0_0/0.3)]
        transform transition-transform duration-300 ease-out
        ${open ? 'translate-y-0' : 'translate-y-full sm:translate-y-[calc(100%+2rem)]'}
      `}>

        {/* Header fixo */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {isBuy ? <TrendingUp size={15} strokeWidth={2.5} /> : <TrendingDown size={15} strokeWidth={2.5} />}
            </div>
            <p className="text-sm font-semibold">Novo Lançamento</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition-all"
          >
            <X size={15} />
          </button>
        </div>

        <div className="h-px bg-[var(--color-border)] mx-5 flex-shrink-0" />

        {/* Corpo com scroll */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

          {/* Tipo de operação */}
          <div>
            <label className={labelClass}>Tipo de operação</label>
            <div className="grid grid-cols-2 gap-2">
              {(['BUY', 'SELL'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxType(t)}
                  className={`
                    flex items-center justify-center gap-2 py-2.5 rounded-xl
                    border text-sm font-medium transition-all duration-150
                    ${
                      txType === t
                        ? t === 'BUY'
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                          : 'border-red-500/60 bg-red-500/10 text-red-400'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-primary-highlight)]'
                    }
                  `}
                >
                  {t === 'BUY' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {t === 'BUY' ? 'Compra' : 'Venda'}
                  {txType === t && <CheckCircle2 size={13} />}
                </button>
              ))}
            </div>
          </div>

          {/* Classe de ativo — sempre visível */}
          <ClassSelect
            value={selectedClassId}
            onChange={setSelectedClassId}
            classes={sortedClasses}
            selectClass={selectClass}
            labelClass={labelClass}
            showSuggested={!!(selectedClassId && backendQuote?.inferredClass)}
          />

          {/* Ativo — combobox */}
          <div>
            <label className={labelClass}>Ativo</label>
            <AssetCombobox
              value={tickerInput}
              onChange={(raw) => {
                setTickerInput(raw)
                if (resolvedAsset && raw !== resolvedAsset.ticker) {
                  setResolvedAsset(null)
                  setSearchDone(false)
                  setSearchedTicker('')
                  setSelectedClassId('')
                }
              }}
              onSelect={handleSelectLocalAsset}
              onTriggerRemoteSearch={handleTriggerRemoteSearch}
              inputClass={inputBase}
              disabled={classesLoading}
            />

            {searchLoading && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-2">
                <Loader2 size={12} className="animate-spin" />
                Buscando {searchedTicker} no mercado…
              </p>
            )}

            {resolvedAsset && !searchLoading && (
              <div className="flex items-center gap-3 px-3.5 py-2.5 mt-2 bg-emerald-500/8 border border-emerald-500/25 rounded-xl">
                <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
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

            {/* Ativo novo: nome + aviso */}
            {isNewAsset && !searchLoading && (
              <div className="mt-3 space-y-3">
                <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                  backendQuote?.name
                    ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                    : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {backendQuote?.name
                    ? <><Sparkles size={11} /><span>Nome sugerido — confirme os dados</span></>
                    : <><AlertCircle size={11} /><span>Ativo não encontrado. Preencha manualmente.</span></>}
                </div>
                <div>
                  <label className={labelClass}>Nome do ativo *</label>
                  <textarea
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    placeholder="Ex: Tesouro IPCA+ 2035"
                    rows={2}
                    className={[inputBase, 'resize-none leading-snug'].join(' ')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Data */}
          <div>
            <label className={labelClass}>Data do negócio</label>
            <input
              type="date" value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              className={inputBase}
            />
          </div>

          {/* Quantidade + Preço */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantidade</label>
              <input
                type="number" min="0" step="1" value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className={`${inputBase} tabular-nums`}
              />
            </div>
            <div>
              <label className={labelClass}>Preço unitário (R$)</label>
              <input
                type="number" min="0" step="0.01" value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0,00"
                className={`${inputBase} tabular-nums`}
              />
            </div>
          </div>

          {/* Taxas */}
          <div>
            <label className={labelClass}>Taxas (R$)</label>
            <input
              type="number" min="0" step="0.01" value={fees}
              onChange={(e) => setFees(e.target.value)}
              className={`${inputBase} tabular-nums`}
            />
          </div>

          {/* Resumo */}
          {grossAmount > 0 && (
            <div className="bg-[var(--color-surface-offset)] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>Valor bruto</span>
                <span className="tabular-nums">{fmt.currency(grossAmount)}</span>
              </div>
              {parseFloat(fees) > 0 && (
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Taxas</span>
                  <span className="tabular-nums">{fmt.currency(parseFloat(fees))}</span>
                </div>
              )}
              <div className="h-px bg-[var(--color-border)]" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Total</span>
                <span className={`text-sm font-semibold tabular-nums ${
                  isBuy ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {isBuy ? '-' : '+'}{fmt.currency(netAmount)}
                </span>
              </div>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-lg">
              <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400 leading-relaxed">{submitError}</p>
            </div>
          )}
        </div>

        {/* Footer fixo */}
        <div className="flex-shrink-0">
          <div className="h-px bg-[var(--color-border)] mx-5" />
          <div className="px-5 py-4">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || isSubmitting}
              className={`
                w-full flex items-center justify-center gap-2
                py-3 rounded-xl text-sm font-semibold
                transition-all disabled:opacity-40 disabled:cursor-not-allowed
                ${
                  isBuy
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }
              `}
            >
              {isSubmitting ? (
                <><Loader2 size={15} className="animate-spin" /> Salvando…</>
              ) : (
                <>{isBuy ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                  {isBuy ? 'Confirmar Compra' : 'Confirmar Venda'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
