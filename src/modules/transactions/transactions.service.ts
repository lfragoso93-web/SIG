import { Prisma } from "@prisma/client";
import { prisma } from "../../core/prisma/prisma.service";

type DecimalInput = string | number | Prisma.Decimal | null | undefined;

type CreateTransactionInput = {
  accountId?: string | null;
  assetId?: string | null;
  type: string;
  status?: string;
  tradeDate: Date;
  settlementDate?: Date | null;
  quantity?: DecimalInput;
  unitPrice?: DecimalInput;
  grossAmount: DecimalInput;
  fees?: DecimalInput;
  taxes?: DecimalInput;
  netAmount?: DecimalInput;
  currencyCode?: string;
  exchangeRate?: DecimalInput;
  externalId?: string | null;
  brokerNoteNumber?: string | null;
  description?: string | null;
  importedFrom?: string | null;
  importedRowRef?: string | null;
};

type UpdateTransactionInput = {
  accountId?: string | null;
  assetId?: string | null;
  type?: string;
  status?: string;
  tradeDate?: Date;
  settlementDate?: Date | null;
  quantity?: DecimalInput;
  unitPrice?: DecimalInput;
  grossAmount?: DecimalInput;
  fees?: DecimalInput;
  taxes?: DecimalInput;
  netAmount?: DecimalInput;
  currencyCode?: string;
  exchangeRate?: DecimalInput;
  externalId?: string | null;
  brokerNoteNumber?: string | null;
  description?: string | null;
  importedFrom?: string | null;
  importedRowRef?: string | null;
};

const transactionInclude = {
  account: true,
  asset: {
    include: {
      assetClass: true,
    },
  },
};

const toDecimal = (value: DecimalInput) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

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
        type: data.type as any,
        status: (data.status ?? "POSTED") as any,
        tradeDate: data.tradeDate,
        settlementDate: data.settlementDate ?? null,
        quantity: toDecimal(data.quantity),
        unitPrice: toDecimal(data.unitPrice),
        grossAmount: new Prisma.Decimal(data.grossAmount as string | number | Prisma.Decimal),
        fees: toDecimal(data.fees) ?? new Prisma.Decimal(0),
        taxes: toDecimal(data.taxes) ?? new Prisma.Decimal(0),
        netAmount: toDecimal(data.netAmount),
        currencyCode: data.currencyCode ?? "BRL",
        exchangeRate: toDecimal(data.exchangeRate),
        externalId: data.externalId ?? null,
        brokerNoteNumber: data.brokerNoteNumber ?? null,
        description: data.description ?? null,
        importedFrom: data.importedFrom ?? null,
        importedRowRef: data.importedRowRef ?? null,
      },
      include: transactionInclude,
    });
  }

  async findAll() {
    return prisma.transaction.findMany({
      orderBy: [{ tradeDate: "desc" }, { createdAt: "desc" }],
      include: transactionInclude,
    });
  }

  async findById(id: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude,
    });

    if (!transaction) {
      throw new Error("Transação não encontrada.");
    }

    return transaction;
  }

  async update(id: string, data: UpdateTransactionInput) {
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTransaction) {
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
        accountId:
          data.accountId !== undefined ? data.accountId : undefined,
        assetId:
          data.assetId !== undefined ? data.assetId : undefined,
        type: data.type !== undefined ? (data.type as any) : undefined,
        status: data.status !== undefined ? (data.status as any) : undefined,
        tradeDate: data.tradeDate ?? undefined,
        settlementDate:
          data.settlementDate !== undefined ? data.settlementDate : undefined,
        quantity:
          data.quantity !== undefined ? toDecimal(data.quantity) : undefined,
        unitPrice:
          data.unitPrice !== undefined ? toDecimal(data.unitPrice) : undefined,
        grossAmount:
          data.grossAmount !== undefined
            ? new Prisma.Decimal(data.grossAmount as string | number | Prisma.Decimal)
            : undefined,
        fees:
          data.fees !== undefined ? toDecimal(data.fees) : undefined,
        taxes:
          data.taxes !== undefined ? toDecimal(data.taxes) : undefined,
        netAmount:
          data.netAmount !== undefined ? toDecimal(data.netAmount) : undefined,
        currencyCode:
          data.currencyCode !== undefined ? data.currencyCode : undefined,
        exchangeRate:
          data.exchangeRate !== undefined
            ? toDecimal(data.exchangeRate)
            : undefined,
        externalId:
          data.externalId !== undefined ? data.externalId : undefined,
        brokerNoteNumber:
          data.brokerNoteNumber !== undefined
            ? data.brokerNoteNumber
            : undefined,
        description:
          data.description !== undefined ? data.description : undefined,
        importedFrom:
          data.importedFrom !== undefined ? data.importedFrom : undefined,
        importedRowRef:
          data.importedRowRef !== undefined ? data.importedRowRef : undefined,
      },
      include: transactionInclude,
    });
  }

  async remove(id: string) {
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTransaction) {
      throw new Error("Transação não encontrada.");
    }

    await prisma.transaction.delete({
      where: { id },
    });
  }
}

export default new TransactionsService();