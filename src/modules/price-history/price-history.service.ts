import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma/prisma.service';
import { brapiClient } from '../../providers/brapi/brapi.client';
import type { ImportPriceHistoryBody } from './price-history.schema';

interface ImportPriceHistoryInput extends ImportPriceHistoryBody {
  ticker: string;
}

interface ImportPriceHistoryResult {
  ticker: string;
  inserted: number;
  skipped: number;
  total: number;
}

class PriceHistoryService {
  async importFromBrapi(input: ImportPriceHistoryInput): Promise<ImportPriceHistoryResult> {
    const { ticker, interval, range, startDate, endDate } = input;

    const asset = await prisma.asset.findUnique({
      where: { ticker },
      select: { id: true, ticker: true },
    });

    if (!asset) {
      throw new Error(`Ativo com ticker "${ticker}" não encontrado no banco de dados.`);
    }

    const rows = await brapiClient.getHistoricalPrices({
      ticker,
      interval,
      range,
      startDate,
      endDate,
    });

    if (rows.length === 0) {
      return { ticker, inserted: 0, skipped: 0, total: 0 };
    }

    const payload: Prisma.PriceHistoryCreateManyInput[] = rows.map((row) => ({
      assetId: asset.id,
      priceDate: new Date(row.date),
      openPrice: row.open !== null ? new Prisma.Decimal(row.open) : null,
      highPrice: row.high !== null ? new Prisma.Decimal(row.high) : null,
      lowPrice: row.low !== null ? new Prisma.Decimal(row.low) : null,
      closePrice: new Prisma.Decimal(row.close!),
      adjustedClose: row.adjustedClose !== null ? new Prisma.Decimal(row.adjustedClose) : null,
      currencyCode: row.currencyCode,
      source: 'BRAPI',
    }));

    const result = await prisma.priceHistory.createMany({
      data: payload,
      skipDuplicates: true,
    });

    const inserted = result.count;
    const skipped = rows.length - inserted;

    return { ticker, inserted, skipped, total: rows.length };
  }
}

export const priceHistoryService = new PriceHistoryService();
