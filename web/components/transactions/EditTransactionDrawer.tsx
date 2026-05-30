'use client'

import { useState, useEffect } from 'react'
import {
  X, Loader2, AlertCircle, TrendingUp, TrendingDown, Save,
} from 'lucide-react'
import { fmt } from '@/lib/utils'
import {
  useUpdateTransaction,
  type Transaction,
} from '@/lib/hooks/useTransactions'

interface Props {
  transaction: Transaction | null
  open: boolean
  onClose: () => void
}

function extractErrorMessage(error: unknown): string {
  if (!error) return 'Erro desconhecido.'
  const err = error as {
    response?: { data?: { message?: string; error?: string } }
    message?: string
  }
  const data = err?.response?.data
  if (data?.message) return data.message
  if (data?.error)   return data.error
  if (err?.message)  return err.message
  return 'Erro ao salvar. Tente novamente.'
}

function toNum(v: string | number | undefined): number {
  if (v == null) return 0
  return typeof v === 'string' ? parseFloat(v) : v
}

export function EditTransactionDrawer({ transaction, open, onClose }: Props) {
  const updateTx = useUpdateTransaction()

  const [txType,    setTxType]    = useState<'BUY' | 'SELL'>('BUY')
  const [tradeDate, setTradeDate] = useState('')
  const [quantity,  setQuantity]  = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [fees,      setFees]      = useState('0')
  const [submitError, setSubmitError] = useState('')

  // Pré-preenche ao abrir
  useEffect(() => {
    if (transaction && open) {
      setTxType(transaction.type)
      setTradeDate(transaction.tradeDate.slice(0, 10))
      setQuantity(String(toNum(transaction.quantity)))
      setUnitPrice(String(toNum(transaction.unitPrice)))
      setFees(String(toNum(transaction.fees)))
      setSubmitError('')
    }
  }, [transaction, open])

  const grossAmount = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)
  const netAmount   = grossAmount + (parseFloat(fees) || 0)
  const isBuy       = txType === 'BUY'

  const canSubmit =
    !!tradeDate &&
    parseFloat(quantity) > 0 &&
    parseFloat(unitPrice) > 0

  const handleSubmit = async () => {
    if (!transaction) return
    setSubmitError('')
    try {
      await updateTx.mutateAsync({
        id: transaction.id,
        payload: {
          type:        txType,
          tradeDate,
          quantity:    parseFloat(quantity),
          unitPrice:   parseFloat(unitPrice),
          grossAmount,
          fees:        parseFloat(fees) || 0,
          status:      'POSTED',
        },
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

  const labelClass = 'block text-xs font-medium text-[var(--color-text-muted)] mb-1.5'

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

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

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {isBuy ? <TrendingUp size={15} strokeWidth={2.5} /> : <TrendingDown size={15} strokeWidth={2.5} />}
            </div>
            <div>
              <p className="text-sm font-semibold">Editar Lançamento</p>
              {transaction?.asset && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {transaction.asset.ticker} · {transaction.asset.name}
                </p>
              )}
            </div>
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

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

          {/* Ativo (read-only) */}
          {transaction?.asset && (
            <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[var(--color-surface-offset)] border border-[var(--color-border-subtle)] rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{transaction.asset.ticker}</p>
                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                  {transaction.asset.name}
                  {transaction.asset.assetClass?.name && (
                    <span className="text-[var(--color-text-faint)]"> · {transaction.asset.assetClass.name}</span>
                  )}
                </p>
              </div>
              <span className="ml-auto text-[10px] text-[var(--color-text-faint)] border border-[var(--color-border-subtle)] rounded px-1.5 py-0.5 flex-shrink-0">
                Não editável
              </span>
            </div>
          )}

          {/* Tipo */}
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
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }
                  `}
                >
                  {t === 'BUY' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {t === 'BUY' ? 'Compra' : 'Venda'}
                </button>
              ))}
            </div>
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
              <div className="flex justify-between">
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

        {/* Footer */}
        <div className="flex-shrink-0">
          <div className="h-px bg-[var(--color-border)] mx-5" />
          <div className="px-5 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || updateTx.isPending}
              className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {updateTx.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Salvando…</>
                : <><Save size={15} /> Salvar alterações</>
              }
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
