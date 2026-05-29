'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, Search, ChevronRight, CheckCircle2, Loader2,
  AlertCircle, Sparkles,
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

// Resposta do proxy backend GET /assets/quote/:ticker
interface BackendQuote {
  name:          string | null
  inferredClass: string | null   // sugestão da API — usada apenas para pré-selecionar o <select>
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

// Mapa: nome da classe (como vem do banco) → assetType usado no create
// Valores DEVEM bater com o enum AssetType do Prisma:
//   STOCK | FII | ETF | BDR | CRYPTO | BOND | FUND | CASH | OTHER
const CLASS_NAME_TO_ASSET_TYPE: Record<string, string> = {
  'Fundo Imobiliário':    'FII',      // era 'REIT' — não existe no enum
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

export function NewTransactionDrawer({ open, onClose }: Props) {
  const [step, setStep]         = useState<Step>('type')
  const [txType, setTxType]     = useState<'BUY' | 'SELL'>('BUY')

  // Ativo
  const [tickerInput, setTickerInput]         = useState('')
  const [searchedTicker, setSearchedTicker]   = useState('')
  const [resolvedAsset, setResolvedAsset]     = useState<Asset | null>(null)
  const [backendQuote, setBackendQuote]       = useState<BackendQuote | null>(null)
  const [searchLoading, setSearchLoading]     = useState(false)
  const [searchDone, setSearchDone]           = useState(false)

  // Dados para cadastro de novo ativo
  const [newAssetName, setNewAssetName]       = useState('')
  // selectedClassId: sempre escolhido manualmente; pré-populado com a sugestão da API quando disponível
  const [selectedClassId, setSelectedClassId] = useState('')

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

  // Nome da classe selecionada — usado para derivar o assetType no submit
  const selectedClassName = (assetClasses.data ?? []).find(
    (c: AssetClass) => c.id === selectedClassId,
  )?.name ?? ''
  const inferredAssetType = CLASS_NAME_TO_ASSET_TYPE[selectedClassName] ?? 'OTHER'

  // Reset ao fechar
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

  // Quando asset é encontrado no banco local
  useEffect(() => {
    if (assetQuery.data) setResolvedAsset(assetQuery.data)
    else                 setResolvedAsset(null)
  }, [assetQuery.data])

  // Busca: chama o proxy do backend
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

      // Preenche nome se a API retornou
      if (quote?.name) setNewAssetName(quote.name)

      // Pré-seleciona a classe sugerida pela API (usuário ainda pode alterar)
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
            assetClassId: selectedClassId,
            assetType:    inferredAssetType,
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
                    placeholder="Ex: PETR4, MXRF11, TESOURO-SELIC-2029"
                    maxLength={30}
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

              {/* Ativo já existe no banco */}
              {resolvedAsset && !isNewAsset && (
                <div className="flex items-start gap-3 px-3 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{resolvedAsset.ticker}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{resolvedAsset.name}</p>
                    <p className="text-xs text-[var(--color-text-faint)]">{resolvedAsset.assetClass?.name}</p>
                  </div>
                </div>
              )}

              {/* Novo ativo — formulário de cadastro */}
              {isNewAsset && (
                <div className="space-y-3">
                  {/* Banner de status da busca */}
                  <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg ${
                    backendQuote?.name
                      ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {backendQuote?.name ? (
                      <><Sparkles size={12} /> Nome coletado — confirme os dados abaixo</>
                    ) : (
                      <><AlertCircle size={12} /> Ativo não encontrado na API. Preencha manualmente.</>
                    )}
                  </div>

                  {/* Nome — coletado pela API, editável pelo usuário */}
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Nome do ativo *</label>
                    <input
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      placeholder="Ex: Maxi Renda FII"
                      className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-faint)]"
                    />
                  </div>

                  {/* Classe — SEMPRE seleção manual; pré-selecionada pela sugestão da API quando disponível */}
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">
                      Classe de ativo *
                      {selectedClassId && backendQuote?.inferredClass && (
                        <span className="ml-1.5 text-[var(--color-primary)] opacity-70">(sugerida pela API)</span>
                      )}
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                      className="w-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
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
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">Preço unitário</label>
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
                { label: 'Operação',    value: txType === 'BUY' ? '↑ Compra' : '↓ Venda'                   },
                { label: 'Ativo',       value: `${searchedTicker} — ${resolvedAsset?.name ?? newAssetName}`  },
                { label: 'Classe',      value: resolvedAsset?.assetClass?.name ?? selectedClassName           },
                { label: 'Data',        value: fmt.date(tradeDate)                                           },
                { label: 'Quantidade',  value: fmt.number(parseFloat(quantity) || 0, 0)                     },
                { label: 'Preço unit.', value: fmt.currency(parseFloat(unitPrice) || 0)                     },
                { label: 'Taxas',       value: fmt.currency(parseFloat(fees) || 0)                          },
                { label: 'Total',       value: fmt.currency(netAmount)                                      },
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
