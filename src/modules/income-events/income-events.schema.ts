import { z } from "zod";

const decimalLike = z.union([z.number(), z.string()]);

const incomeEventTypeEnum = z.enum([
  "DIVIDEND",
  "JCP",
  "FII_INCOME",
  "COUPON",
  "AMORTIZATION",
  "SUBSCRIPTION_RIGHT",
  "OTHER",
]);

const incomeEventStatusEnum = z.enum(["ANNOUNCED", "CONFIRMED", "PAID", "CANCELED"]);

const incomeEventBaseSchema = z.object({
  assetId: z.string().min(1),
  accountId: z.string().min(1).optional().nullable(),
  type: incomeEventTypeEnum,
  status: incomeEventStatusEnum.optional(),
  exDate: z.coerce.date(),
  paymentDate: z.coerce.date().optional().nullable(),
  grossAmountPerShare: decimalLike,
  withholdingTaxRate: decimalLike.optional().nullable(),
  netAmountPerShare: decimalLike.optional().nullable(),
  quantityAtExDate: decimalLike.optional().nullable(),
  totalGrossAmount: decimalLike.optional().nullable(),
  totalNetAmount: decimalLike.optional().nullable(),
  currencyCode: z.string().min(1).max(10).optional(),
  externalId: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  importedFrom: z.string().max(100).optional().nullable(),
});

export const createIncomeEventSchema = incomeEventBaseSchema;

export const updateIncomeEventSchema = incomeEventBaseSchema.partial();

export const incomeEventIdParamSchema = z.object({
  id: z.string().min(1),
});

export const importIncomeEventsParamSchema = z.object({
  ticker: z.string().min(1).toUpperCase(),
});
