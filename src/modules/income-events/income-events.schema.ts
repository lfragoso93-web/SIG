import { z } from "zod";

const decimalLike = z.union([z.number(), z.string()]);

const incomeTypeEnum = z.enum([
  "DIVIDEND",
  "JCP",
  "FII_INCOME",
  "COUPON",
  "INTEREST",
  "AMORTIZATION",
  "SUBSCRIPTION_RIGHT",
  "OTHER",
]);

const incomeStatusEnum = z.enum(["ANNOUNCED", "CONFIRMED", "PAID", "CANCELED"]);

const incomeEventBaseSchema = z.object({
  assetId: z.string().min(1),
  accountId: z.string().min(1).optional().nullable(),
  type: incomeTypeEnum,
  status: incomeStatusEnum.optional(),
  exDate: z.coerce.date().optional().nullable(),
  paymentDate: z.coerce.date().optional().nullable(),
  quantityBase: decimalLike.optional().nullable(),
  amountPerUnit: decimalLike.optional().nullable(),
  grossAmount: decimalLike.optional().nullable(),
  taxes: decimalLike.optional(),
  netAmount: decimalLike.optional().nullable(),
  currencyCode: z.string().min(1).max(10).optional(),
  externalId: z.string().max(150).optional().nullable(),
  importedFrom: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createIncomeEventSchema = incomeEventBaseSchema;

export const updateIncomeEventSchema = incomeEventBaseSchema.partial();

export const incomeEventIdParamSchema = z.object({
  id: z.string().min(1),
});

export const importIncomeEventsParamSchema = z.object({
  ticker: z.string().min(1).toUpperCase(),
});
