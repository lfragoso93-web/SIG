import { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma/prisma.service";

type CreateTransactionInput = {
  accountId?: string | null;
  assetId?: string | null;
  type: string;
  status?: string;
  tradeDate: Date;
  settlementDate?: Date | null;
  quantity?: string | number | null;
  unitPrice?: string | number | null;
  grossAmount: string | number;
  fees?: string | number;
  taxes?: string | number;
  netAmount?: string | number | null;
  currencyCode?: string;
  exchangeRate?: string | number | null;
  externalId?: string | null;
  brokerNoteNumber?: string | null;
  description?: string | null;
  importedFrom?: string | null;
  importedRowRef?: string | null;
};

type UpdateTransactionInput = Partial<CreateTransactionInput>;

const toDecimal = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") return undefined;
  return new Prisma.Decimal(value);
};

class TransactionsService {
  async create(data: CreateTransactionInput) {
  if (data.accountId) {
    const account = await prisma.account.findUnique({
      where: { id: data.accountId },
    });

    if (!account) {
      throw new Error("Conta não encontrada.");
    }
  }

  if (data.assetId) {
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
    });

    if (!asset) {
      throw new Error("Ativo não encontrado.");
    }
  }

  return prisma.transaction.create({
    data: {
      accountId: data.accountId ?? null,
      assetId: data.assetId ?? null,
      type: data.type,
      status: data.status ?? "POSTED",
      tradeDate: data.tradeDate,
      settlementDate: data.settlementDate ?? null,
      quantity: data.quantity ?? null,
      unitPrice: data.unitPrice ?? null,
      grossAmount: data.grossAmount,
      fees: data.fees ?? 0,
      taxes: data.taxes ?? 0,
      netAmount: data.netAmount ?? null,
      currencyCode: data.currencyCode ?? "BRL",
      exchangeRate: data.exchangeRate ?? null,
      externalId: data.externalId ?? null,
      brokerNoteNumber: data.brokerNoteNumber ?? null,
      description: data.description ?? null,
      importedFrom: data.importedFrom ?? null,
      importedRowRef: data.importedRowRef ?? null,
    },
    include: {
      account: true,
      asset: {
        include: {
          assetClass: true,
        },
      },
    },
  });
}

  async findAll() {
    return prisma.transaction.findMany({
      include: {
        account: true,
        asset: true,
      },
      orderBy: {
        tradeDate: "desc",
      },
    });
  }

  async findById(id: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
        asset: true,
      },
    });

    if (!transaction) {
      throw new Error("Transação não encontrada.");
    }

    return transaction;
  }

  async update(id: string, data: UpdateTransactionInput) {
    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing) {
      throw new Error("Transação não encontrada.");
    }

    if (data.accountId) {
  const account = await prisma.account.findUnique({
    where: { id: data.accountId },
  });

  if (!account) {
    throw new Error("Conta não encontrada.");
  }
}

    if (data.assetId) {
      const asset = await prisma.asset.findUnique({
        where: { id: data.assetId },
      });

      if (!asset) {
        throw new Error("Ativo não encontrado.");
      }
    }

    return prisma.transaction.update({
      where: { id },
      data: {
        accountId: data.accountId !== undefined ? data.accountId : undefined,
        assetId: data.assetId,
        type: data.type as any,
        status: data.status as any,
        tradeDate: data.tradeDate,
        settlementDate: data.settlementDate,
        quantity: data.quantity !== undefined ? toDecimal(data.quantity) : undefined,
        unitPrice: data.unitPrice !== undefined ? toDecimal(data.unitPrice) : undefined,
        grossAmount: data.grossAmount !== undefined ? new Prisma.Decimal(data.grossAmount) : undefined,
        fees: data.fees !== undefined ? new Prisma.Decimal(data.fees) : undefined,
        taxes: data.taxes !== undefined ? new Prisma.Decimal(data.taxes) : undefined,
        netAmount: data.netAmount !== undefined ? toDecimal(data.netAmount) : undefined,
        currencyCode: data.currencyCode,
        exchangeRate: data.exchangeRate !== undefined ? toDecimal(data.exchangeRate) : undefined,
        externalId: data.externalId,
        brokerNoteNumber: data.brokerNoteNumber,
        description: data.description,
        importedFrom: data.importedFrom,
        importedRowRef: data.importedRowRef,
      },
      include: {
        account: true,
        asset: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing) {
      throw new Error("Transação não encontrada.");
    }

    await prisma.transaction.delete({
      where: { id },
    });
  }
}

export const transactionsService = new TransactionsService();