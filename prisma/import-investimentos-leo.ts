import "dotenv/config";
import * as XLSX from "xlsx";
import { PrismaClient, AssetType, TransactionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não definida.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const FILE_PATH = process.env.IMPORT_FILE_PATH || "./Investimentos-Leo.xlsx";
const DEFAULT_ACCOUNT_NAME = "Carteira Principal";

const IGNORED_TYPES = new Set(["Renda Fixa", "Tesouro Direto", "Exterior"]);

const ASSET_CLASS_MAP: Record<string, { classCode: string; className: string; assetType: AssetType }> = {
  "Ação": { classCode: "ACOES", className: "Ações", assetType: AssetType.STOCK },
  "Ações": { classCode: "ACOES", className: "Ações", assetType: AssetType.STOCK },
  "BDR": { classCode: "BDR", className: "BDR", assetType: AssetType.BDR },
  "BDRs": { classCode: "BDR", className: "BDR", assetType: AssetType.BDR },
  "ETF": { classCode: "ETF", className: "ETF", assetType: AssetType.ETF },
  "ETFs": { classCode: "ETF", className: "ETF", assetType: AssetType.ETF },
  "FII": { classCode: "FII", className: "FII", assetType: AssetType.FII },
  "FIIs": { classCode: "FII", className: "FII", assetType: AssetType.FII },
  "Exterior": { classCode: "EXTERIOR", className: "Exterior", assetType: AssetType.STOCK },
  "Criptomoeda": { classCode: "CRIPTO", className: "Criptomoedas", assetType: AssetType.CRYPTO },
  "Criptomoedas": { classCode: "CRIPTO", className: "Criptomoedas", assetType: AssetType.CRYPTO },
};

function normalizeType(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeAssetName(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const asString = String(value ?? "").trim();
  const dt = new Date(asString);
  if (!Number.isNaN(dt.getTime())) return dt;
  throw new Error(`Data inválida: ${value}`);
}

function getCell(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (alias in row) return row[alias];
  }
  return null;
}

async function ensureDefaultAccount() {
  const account = await prisma.account.findFirst({
    where: { name: DEFAULT_ACCOUNT_NAME },
  });

  if (account) return account;

  return prisma.account.create({
    data: {
      name: DEFAULT_ACCOUNT_NAME,
      type: "BROKERAGE",
      currencyCode: "BRL",
      isActive: true,
    },
  });
}

async function ensureAsset(typeLabel: string, assetName: string) {
  const mapped = ASSET_CLASS_MAP[typeLabel];

  if (!mapped) {
    throw new Error(`Tipo de ativo não mapeado: ${typeLabel} / ativo: ${assetName}`);
  }

  const assetClass = await prisma.assetClass.upsert({
    where: { code: mapped.classCode },
    update: { name: mapped.className, isActive: true },
    create: {
      code: mapped.classCode,
      name: mapped.className,
      isActive: true,
    },
  });

  const asset = await prisma.asset.upsert({
    where: { ticker: assetName },
    update: {
      name: assetName,
      assetType: mapped.assetType,
      assetClassId: assetClass.id,
      isActive: true,
    },
    create: {
      ticker: assetName,
      name: assetName,
      assetType: mapped.assetType,
      assetClassId: assetClass.id,
      currencyCode: "BRL",
      isActive: true,
    },
  });

  return asset;
}

async function importSheet(sheetName: string, transactionType: TransactionType) {
  const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Aba não encontrada: ${sheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  const account = await ensureDefaultAccount();
  let imported = 0;
  let skipped = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    const assetName = normalizeAssetName(getCell(row, ["Ativo"]));
    const typeLabel = normalizeType(getCell(row, ["Tipo de Ativo"]));

    if (!assetName || !typeLabel) {
      skipped++;
      continue;
    }

    if (IGNORED_TYPES.has(typeLabel)) {
      skipped++;
      continue;
    }

    const dateValue =
      transactionType === "BUY"
        ? getCell(row, ["Data Compra", "Data da Compra", "Data"])
        : getCell(row, ["Data Venda", "Data da Venda", "Data"]);

    const unitPrice = toNumber(getCell(row, ["Valor da Cota", "Preço", "Preço Médio Venda", "Valor da Venda"]));
    const quantity = toNumber(getCell(row, ["Cotas", "Quantidade"]));
    const fees = toNumber(getCell(row, ["Taxas", "Taxa", "Custos"]));
    const grossAmount = toNumber(
      getCell(
        row,
        transactionType === "BUY"
          ? ["Total da Compra", "Total Compra", "Valor Total"]
          : ["Total da Venda", "Total Venda", "Valor Total"]
      )
    );

    if (!dateValue || !quantity || !grossAmount) {
      skipped++;
      continue;
    }

    const tradeDate = toDate(dateValue);
    const asset = await ensureAsset(typeLabel, assetName);

    const externalId = `${sheetName}:${index + 2}:${assetName}:${tradeDate.toISOString().slice(0, 10)}:${quantity}:${grossAmount}`;

    await prisma.transaction.upsert({
      where: {
        transaction_account_externalId_unique: {
          accountId: account.id,
          externalId,
        },
      },
      update: {
        assetId: asset.id,
        type: transactionType,
        tradeDate,
        quantity,
        unitPrice,
        grossAmount,
        fees,
        currencyCode: "BRL",
        importedFrom: FILE_PATH,
        importedRowRef: `${sheetName}:${index + 2}`,
      },
      create: {
        accountId: account.id,
        assetId: asset.id,
        type: transactionType,
        tradeDate,
        quantity,
        unitPrice,
        grossAmount,
        fees,
        currencyCode: "BRL",
        importedFrom: FILE_PATH,
        importedRowRef: `${sheetName}:${index + 2}`,
        externalId,
      },
    });

    imported++;
  }

  return { imported, skipped };
}

async function main() {
  const buyResult = await importSheet("Compras", "BUY");
  const sellResult = await importSheet("Venda", "SELL");

  console.log({
    compras: buyResult,
    vendas: sellResult,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });