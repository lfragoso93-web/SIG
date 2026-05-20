// src/modules/price-history/price-history.import.service.ts

import prisma from '../../core/prisma';
import brapiClient, {
  BrapiInterval,
  BrapiRange,
  BrapiHistoricalPriceRow,
} from '../../providers/brapi/brapi.client';

interface ImportPriceHistoryInput {
  ticker: string;
  range?: BrapiRange;
  interval?: BrapiInterval;
  startDate?: string;
  endDate?: string;
}

interface ImportPriceHistoryResult {
  assetId: string;
  ticker: string;
  requested: number;
  inserted: number;
  skipped: number;
}

class PriceHistoryImportService {
  async importFromBrapi(
    input: ImportPriceHistoryInput
  ): Promise<ImportPriceHistoryResult> {
    const ticker = input.ticker.trim().toUpperCase();

    const asset = await prisma.asset.findUnique({
      where: { ticker },
      select: { id: true, ticker: true },
    });

    if (!asset) {
      throw new Error(`Ativo ${ticker} não encontrado na base local.`);
    }

    const rows = await brapiClient.getHistoricalPrices({
      ticker,
      range: input.range,
      interval: input.interval ?? '1d',
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const normalizedRows = this.normalizeRows(rows, asset.id);

    if (!normalizedRows.length) {
      return {
        assetId: asset.id,
        ticker: asset.ticker,
        requested: 0,
        inserted: 0,
        skipped: 0,
      };
    }

    const existingRows = await prisma.priceHistory.findMany({
      where: {
        assetId: asset.id,
        priceDate: {
          in: normalizedRows.map((row) => row.priceDate),
        },
      },
      select: {
        priceDate: true,
      },
    });

    const existingDates = new Set(
      existingRows.map((row) => row.priceDate.toISOString().slice(0, 10))
    );

    const rowsToInsert = normalizedRows.filter(
      (row) => !existingDates.has(row.priceDate.toISOString().slice(0, 10))
    );

    if (rowsToInsert.length) {
      await prisma.priceHistory.createMany({
        data: rowsToInsert,
        skipDuplicates: true,
      });
    }

    return {
      assetId: asset.id,
      ticker: asset.ticker,
      requested: normalizedRows.length,
      inserted: rowsToInsert.length,
      skipped: normalizedRows.length - rowsToInsert.length,
    };
  }

  private normalizeRows(rows: BrapiHistoricalPriceRow[], assetId: string) {
    return rows
      .filter((row) => row.date && row.close != null)
      .map((row) => ({
        assetId,
        priceDate: new Date(`${row.date}T00:00:00.000Z`),
        openPrice: row.open ?? row.close ?? 0,
        highPrice: row.high ?? row.close ?? 0,
        lowPrice: row.low ?? row.close ?? 0,
        closePrice: row.close ?? 0,
        adjustedClosePrice: row.adjustedClose ?? row.close ?? 0,
        volume: row.volume ?? null,
        source: 'BRAPI',
      }));
  }
}

export default new PriceHistoryImportService();