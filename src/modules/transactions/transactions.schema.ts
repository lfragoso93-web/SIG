import { z } from "zod";

const decimalLike = z.union([z.number(), z.string()]);

const transactionTypeEnum = z.enum([
  "BUY",
  "SELL",
  "DEPOSIT",
  "WITHDRAW",
  "FEE",
  "TAX",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "SPLIT",
  "REVERSE_SPLIT",
  "BONUS",
  "AMORTIZATION",
  "OTHER",
]);

const transactionStatusEnum = z.enum(["POSTED", "PENDING", "CANCELED"]);

const transactionBaseSchema = z.object({
  accountId: z.string().min(1).optional().nullable(),
  assetId: z.string().min(1).optional().nullable(),
  type: transactionTypeEnum,
  status: transactionStatusEnum.optional(),
  tradeDate: z.coerce.date(),
  settlementDate: z.coerce.date().optional().nullable(),
  quantity: decimalLike.optional().nullable(),
  unitPrice: decimalLike.optional().nullable(),
  grossAmount: decimalLike,
  fees: decimalLike.optional(),
  taxes: decimalLike.optional(),
  netAmount: decimalLike.optional().nullable(),
  currencyCode: z.string().min(1).max(10).optional(),
  exchangeRate: decimalLike.optional().nullable(),
  externalId: z.string().max(100).optional().nullable(),
  brokerNoteNumber: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  importedFrom: z.string().max(100).optional().nullable(),
  importedRowRef: z.string().max(100).optional().nullable(),
});

export const createTransactionSchema = transactionBaseSchema.superRefine(
  (data, ctx) => {
    if (data.type === "BUY" || data.type === "SELL") {
      if (!data.assetId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assetId"],
          message: "assetId é obrigatório para BUY e SELL.",
        });
      }

      if (data.quantity == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["quantity"],
          message: "quantity é obrigatório para BUY e SELL.",
        });
      }

      if (data.unitPrice == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unitPrice"],
          message: "unitPrice é obrigatório para BUY e SELL.",
        });
      }
    }
  }
);

export const updateTransactionSchema = transactionBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    const isBuyOrSell = data.type === "BUY" || data.type === "SELL";

    if (!isBuyOrSell) {
      return;
    }

    if ("assetId" in data && !data.assetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assetId"],
        message: "assetId não pode ser vazio para BUY e SELL.",
      });
    }

    if ("quantity" in data && data.quantity == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "quantity não pode ser nulo para BUY e SELL.",
      });
    }

    if ("unitPrice" in data && data.unitPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitPrice"],
        message: "unitPrice não pode ser nulo para BUY e SELL.",
      });
    }
  });

export const transactionIdParamSchema = z.object({
  id: z.string().min(1),
});