import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---- Formatadores financeiros ----

const BRL = new Intl.NumberFormat('pt-BR', {
  style:    'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const PCT = new Intl.NumberFormat('pt-BR', {
  style:                 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const fmt = {
  currency: (v: number) => BRL.format(v),

  percent: (v: number) => PCT.format(v / 100),

  // Ex: 1234567 => "1.234.567"
  number: (v: number, decimals = 2) =>
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v),

  date: (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
      new Date(iso),
    ),

  // Exibe sinal + cor: +R$ 1.234,00 ou -R$ 500,00
  pnl: (v: number) => ({
    text:      (v >= 0 ? '+' : '') + BRL.format(v),
    className: v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral',
  }),
}
