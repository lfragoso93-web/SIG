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

export interface GetQuoteParams {
  ticker: string;
  range?: BrapiRange;
  interval?: BrapiInterval;
  startDate?: string;
  endDate?: string;
  dividends?: boolean;
  modules?: string[];
}

export interface BrapiHistoricalPriceRow {
  date: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  adjustedClose?: number | null;
  volume?: number | null;
}

export interface BrapiQuoteResult {
  symbol: string;
  shortName?: string | null;
  longName?: string | null;
  currency?: string | null;
  regularMarketPrice?: number | null;
  regularMarketTime?: string | number | null;
  historicalDataPrice?: Array<{
    date: number | string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    adjustedClose?: number;
    volume?: number;
  }>;
}

export interface BrapiQuoteResponse {
  results: BrapiQuoteResult[];
  requestedAt?: string;
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

class BrapiClient {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: process.env.BRAPI_BASE_URL || 'https://brapi.dev/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.BRAPI_TOKEN
          ? { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` }
          : {}),
      },
    });
  }

  async getQuote(params: GetQuoteParams): Promise<BrapiQuoteResult> {
    const {
      ticker,
      range,
      interval,
      startDate,
      endDate,
      dividends,
      modules,
    } = params;

    try {
      const response = await this.http.get<BrapiQuoteResponse>(
        `/quote/${encodeURIComponent(ticker)}`,
        {
          params: {
            ...(range ? { range } : {}),
            ...(interval ? { interval } : {}),
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
            ...(typeof dividends === 'boolean'
              ? { dividends: String(dividends) }
              : {}),
            ...(modules?.length ? { modules: modules.join(',') } : {}),
          },
        }
      );

      const result = response.data?.results?.[0];

      if (!result) {
        throw new BrapiHttpError(
          `Nenhum resultado encontrado para o ticker ${ticker}`,
          response.status,
          response.data
        );
      }

      return result;
    } catch (error: any) {
      if (error instanceof BrapiHttpError) {
        throw error;
      }

      throw new BrapiHttpError(
        `Erro ao consultar brapi para o ticker ${ticker}`,
        error?.response?.status,
        error?.response?.data
      );
    }
  }

  async getHistoricalPrices(params: GetQuoteParams): Promise<BrapiHistoricalPriceRow[]> {
    const result = await this.getQuote(params);

    const rows = result.historicalDataPrice ?? [];

    return rows
      .map((row) => ({
        date: this.normalizeDate(row.date),
        open: row.open ?? null,
        high: row.high ?? null,
        low: row.low ?? null,
        close: row.close ?? null,
        adjustedClose: row.adjustedClose ?? null,
        volume: row.volume ?? null,
      }))
      .filter((row) => !!row.date);
  }

  private normalizeDate(value: string | number): string {
    if (typeof value === 'number') {
      return new Date(value * 1000).toISOString().slice(0, 10);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toISOString().slice(0, 10);
  }
}

export default new BrapiClient();