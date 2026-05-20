import axios, { AxiosInstance } from 'axios';

export type BrapiRange =
  | '1d'
  | '2d'
  | '5d'
  | '7d'
  | '1mo'
  | '3mo'
  | '6mo'
  | '1y'
  | '2y'
  | '5y'
  | '10y'
  | 'ytd'
  | 'max';

export type BrapiInterval =
  | '1m'
  | '2m'
  | '5m'
  | '15m'
  | '30m'
  | '60m'
  | '90m'
  | '1h'
  | '1d'
  | '5d'
  | '1wk'
  | '1mo'
  | '3mo';

export interface GetHistoricalPricesParams {
  ticker: string;
  interval?: BrapiInterval;
  range?: BrapiRange;
  startDate?: string;
  endDate?: string;
}

interface BrapiHistoricalRowRaw {
  date: number | string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  adjustedClose?: number | null;
  volume?: number | null;
}

interface BrapiQuoteResult {
  symbol: string;
  currency?: string | null;
  historicalDataPrice?: BrapiHistoricalRowRaw[];
  dividendsData?: {
    cashDividends?: BrapiCashDividend[];
  };
}

interface BrapiQuoteResponse {
  results: BrapiQuoteResult[];
}

export interface BrapiHistoricalPriceRow {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjustedClose: number | null;
  currencyCode: string;
}

export interface BrapiCashDividend {
  assetIssued: string;
  paymentDate: string;
  rate: number;
  relatedTo: string;
  approvedOn: string;
  isinCode: string;
  label: string;
  lastDatePrior: string;
  remarks: string;
}

export class BrapiHttpError extends Error {
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'BrapiHttpError';
    this.status = status;
    this.details = details;
  }
}

const buildParams = (input: GetHistoricalPricesParams): Record<string, string> => {
  const hasStartDate = !!input.startDate;
  const hasEndDate = !!input.endDate;

  if (hasStartDate !== hasEndDate) {
    throw new Error('startDate e endDate devem ser informados juntos.');
  }

  const params: Record<string, string> = {
    interval: input.interval ?? '1d',
  };

  if (hasStartDate && hasEndDate) {
    params.startDate = input.startDate!;
    params.endDate = input.endDate!;
  } else {
    params.range = input.range ?? '1y';
  }

  if (process.env.BRAPI_TOKEN) {
    params.token = process.env.BRAPI_TOKEN;
  }

  return params;
};

const normalizeDate = (value: string | number): string => {
  if (typeof value === 'number') {
    return new Date(value * 1000).toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

class BrapiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.BRAPI_BASE_URL ?? 'https://brapi.dev/api',
      timeout: 30_000,
    });
  }

  async getHistoricalPrices(
    input: GetHistoricalPricesParams
  ): Promise<BrapiHistoricalPriceRow[]> {
    const ticker = input.ticker.trim().toUpperCase();

    try {
      const params = buildParams(input);
      const response = await this.http.get<BrapiQuoteResponse>(
        `/quote/${encodeURIComponent(ticker)}`,
        { params }
      );

      const result = response.data?.results?.[0];

      if (!result) {
        throw new BrapiHttpError(
          `Nenhum resultado para o ticker ${ticker}.`,
          response.status,
          response.data
        );
      }

      const currencyCode = result.currency ?? 'BRL';

      return (result.historicalDataPrice ?? [])
        .map((row) => ({
          date: normalizeDate(row.date),
          open: toNullableNumber(row.open),
          high: toNullableNumber(row.high),
          low: toNullableNumber(row.low),
          close: toNullableNumber(row.close),
          adjustedClose: toNullableNumber(row.adjustedClose),
          currencyCode,
        }))
        .filter((row) => !!row.date && row.close !== null);
    } catch (error: any) {
      if (error instanceof BrapiHttpError) throw error;
      throw new BrapiHttpError(
        `Erro ao consultar brapi para o ticker ${ticker}: ${error?.message}`,
        error?.response?.status,
        error?.response?.data
      );
    }
  }

  async getDividends(ticker: string): Promise<BrapiCashDividend[]> {
    const t = ticker.trim().toUpperCase();

    try {
      const params: Record<string, string> = { modules: 'dividends' };

      if (process.env.BRAPI_TOKEN) {
        params.token = process.env.BRAPI_TOKEN;
      }

      const response = await this.http.get<BrapiQuoteResponse>(
        `/quote/${encodeURIComponent(t)}`,
        { params }
      );

      const result = response.data?.results?.[0];

      if (!result) {
        throw new BrapiHttpError(
          `Nenhum resultado para o ticker ${t}.`,
          response.status,
          response.data
        );
      }

      return result.dividendsData?.cashDividends ?? [];
    } catch (error: any) {
      if (error instanceof BrapiHttpError) throw error;
      throw new BrapiHttpError(
        `Erro ao consultar dividendos na brapi para ${t}: ${error?.message}`,
        error?.response?.status,
        error?.response?.data
      );
    }
  }
}

export const brapiClient = new BrapiClient();
