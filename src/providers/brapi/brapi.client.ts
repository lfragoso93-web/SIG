// src/providers/brapi/brapi.client.ts

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
  dividends?: boolean;
  modules?: string[];
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
  shortName?: string | null;
  longName?: string | null;
  currency?: string | null;
  regularMarketPrice?: number | null;
  regularMarketTime?: string | number | null;
  historicalDataPrice?: BrapiHistoricalRowRaw[];
}

interface BrapiQuoteResponse {
  results: BrapiQuoteResult[];
  requestedAt?: string;
}

export interface BrapiHistoricalPriceRow {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjustedClose: number | null;
  volume: number | null;
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

  async getHistoricalPrices(
    input: GetHistoricalPricesParams
  ): Promise<BrapiHistoricalPriceRow[]> {
    const ticker = input.ticker.trim().toUpperCase();
    const params = this.buildHistoricalParams(input);

    try {
      const response = await this.http.get<BrapiQuoteResponse>(
        `/quote/${encodeURIComponent(ticker)}`,
        { params }
      );

      const result = response.data?.results?.[0];

      if (!result) {
        throw new BrapiHttpError(
          `Nenhum resultado encontrado para o ticker ${ticker}`,
          response.status,
          response.data
        );
      }

      const rows = result.historicalDataPrice ?? [];

      return rows
        .map((row) => ({
          date: this.normalizeDate(row.date),
          open: this.toNullableNumber(row.open),
          high: this.toNullableNumber(row.high),
          low: this.toNullableNumber(row.low),
          close: this.toNullableNumber(row.close),
          adjustedClose: this.toNullableNumber(row.adjustedClose),
          volume: this.toNullableNumber(row.volume),
        }))
        .filter((row) => !!row.date);
    } catch (error: any) {
      if (error instanceof BrapiHttpError) {
        throw error;
      }

      throw new BrapiHttpError(
        `Erro ao consultar histórico na brapi para o ticker ${ticker}`,
        error?.response?.status,
        error?.response?.data
      );
    }
  }

  private buildHistoricalParams(input: GetHistoricalPricesParams) {
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

    if (typeof input.dividends === 'boolean') {
      params.dividends = String(input.dividends);
    }

    if (input.modules?.length) {
      params.modules = input.modules.join(',');
    }

    if (!process.env.BRAPI_TOKEN && process.env.BRAPI_TOKEN_QUERY) {
      params.token = process.env.BRAPI_TOKEN_QUERY;
    }

    return params;
  }

  private normalizeDate(value: string | number): string {
    if (typeof value === 'number') {
      return new Date(value * 1000).toISOString().slice(0, 10);
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toISOString().slice(0, 10);
  }

  private toNullableNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}

export default new BrapiClient();