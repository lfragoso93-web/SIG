-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'FII', 'ETF', 'BDR', 'CRYPTO', 'BOND', 'FUND', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BROKERAGE', 'BANK', 'EXCHANGE', 'WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'DEPOSIT', 'WITHDRAW', 'FEE', 'TAX', 'TRANSFER_IN', 'TRANSFER_OUT', 'SPLIT', 'REVERSE_SPLIT', 'BONUS', 'AMORTIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "IncomeType" AS ENUM ('DIVIDEND', 'JCP', 'FII_INCOME', 'COUPON', 'INTEREST', 'AMORTIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SnapshotPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "AssetClass" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "targetPercentage" DECIMAL(7,4),
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(50),
    "countryCode" VARCHAR(2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "AccountType" NOT NULL,
    "institutionId" TEXT,
    "currencyCode" VARCHAR(10) NOT NULL DEFAULT 'BRL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "ticker" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "normalizedName" VARCHAR(150),
    "assetType" "AssetType" NOT NULL,
    "assetClassId" TEXT NOT NULL,
    "isin" VARCHAR(20),
    "currencyCode" VARCHAR(10) NOT NULL DEFAULT 'BRL',
    "exchange" VARCHAR(50),
    "sector" VARCHAR(100),
    "segment" VARCHAR(100),
    "issuer" VARCHAR(150),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT,
    "type" "TransactionType" NOT NULL,
    "tradeDate" DATE NOT NULL,
    "settlementDate" DATE,
    "quantity" DECIMAL(20,8),
    "unitPrice" DECIMAL(20,8),
    "grossAmount" DECIMAL(20,2) NOT NULL,
    "fees" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "taxes" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(20,2),
    "currencyCode" VARCHAR(10) NOT NULL DEFAULT 'BRL',
    "exchangeRate" DECIMAL(20,8),
    "externalId" VARCHAR(100),
    "brokerNoteNumber" VARCHAR(100),
    "description" TEXT,
    "importedFrom" VARCHAR(100),
    "importedRowRef" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeEvent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "accountId" TEXT,
    "type" "IncomeType" NOT NULL,
    "exDate" DATE,
    "paymentDate" DATE NOT NULL,
    "quantityBase" DECIMAL(20,8),
    "amountPerUnit" DECIMAL(20,8),
    "grossAmount" DECIMAL(20,2) NOT NULL,
    "taxes" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(20,2),
    "currencyCode" VARCHAR(10) NOT NULL DEFAULT 'BRL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "priceDate" DATE NOT NULL,
    "openPrice" DECIMAL(20,8),
    "highPrice" DECIMAL(20,8),
    "lowPrice" DECIMAL(20,8),
    "closePrice" DECIMAL(20,8) NOT NULL,
    "adjustedClose" DECIMAL(20,8),
    "currencyCode" VARCHAR(10) NOT NULL DEFAULT 'BRL',
    "source" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationTarget" (
    "id" TEXT NOT NULL,
    "assetClassId" TEXT NOT NULL,
    "targetPercentage" DECIMAL(7,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "referenceDate" DATE NOT NULL,
    "period" "SnapshotPeriod" NOT NULL DEFAULT 'MONTHLY',
    "totalInvested" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalMarketValue" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalProfitLoss" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalProfitLossPct" DECIMAL(9,6),
    "totalIncome" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "cashBalance" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioClassSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "assetClassId" TEXT NOT NULL,
    "investedAmount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "marketValue" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "profitLoss" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "currentPercentage" DECIMAL(9,6),
    "targetPercentage" DECIMAL(9,6),
    "rebalanceDifference" DECIMAL(20,2),
    "suggestedContribution" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioClassSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioAssetSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "accountId" TEXT,
    "quantity" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "averagePrice" DECIMAL(20,8),
    "marketPrice" DECIMAL(20,8),
    "investedAmount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "marketValue" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "profitLoss" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "profitLossPct" DECIMAL(9,6),
    "incomeReceived" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioAssetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "averagePrice" DECIMAL(20,8),
    "investedAmount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "marketPrice" DECIMAL(20,8),
    "marketValue" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "unrealizedPnL" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "realizedPnL" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetClass_code_key" ON "AssetClass"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AssetClass_name_key" ON "AssetClass"("name");

-- CreateIndex
CREATE INDEX "AssetClass_displayOrder_idx" ON "AssetClass"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_code_key" ON "Institution"("code");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE INDEX "Account_institutionId_idx" ON "Account"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_institutionId_key" ON "Account"("name", "institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_ticker_key" ON "Asset"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_isin_key" ON "Asset"("isin");

-- CreateIndex
CREATE INDEX "Asset_assetClassId_idx" ON "Asset"("assetClassId");

-- CreateIndex
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");

-- CreateIndex
CREATE INDEX "Asset_name_idx" ON "Asset"("name");

-- CreateIndex
CREATE INDEX "Transaction_accountId_tradeDate_idx" ON "Transaction"("accountId", "tradeDate");

-- CreateIndex
CREATE INDEX "Transaction_assetId_tradeDate_idx" ON "Transaction"("assetId", "tradeDate");

-- CreateIndex
CREATE INDEX "Transaction_type_tradeDate_idx" ON "Transaction"("type", "tradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_account_externalId_unique" ON "Transaction"("accountId", "externalId");

-- CreateIndex
CREATE INDEX "IncomeEvent_assetId_paymentDate_idx" ON "IncomeEvent"("assetId", "paymentDate");

-- CreateIndex
CREATE INDEX "IncomeEvent_accountId_paymentDate_idx" ON "IncomeEvent"("accountId", "paymentDate");

-- CreateIndex
CREATE INDEX "IncomeEvent_type_paymentDate_idx" ON "IncomeEvent"("type", "paymentDate");

-- CreateIndex
CREATE INDEX "PriceHistory_priceDate_idx" ON "PriceHistory"("priceDate");

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_assetId_priceDate_key" ON "PriceHistory"("assetId", "priceDate");

-- CreateIndex
CREATE INDEX "AllocationTarget_effectiveFrom_effectiveTo_idx" ON "AllocationTarget"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationTarget_assetClassId_effectiveFrom_key" ON "AllocationTarget"("assetClassId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_referenceDate_idx" ON "PortfolioSnapshot"("referenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioSnapshot_referenceDate_period_key" ON "PortfolioSnapshot"("referenceDate", "period");

-- CreateIndex
CREATE INDEX "PortfolioClassSnapshot_assetClassId_idx" ON "PortfolioClassSnapshot"("assetClassId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioClassSnapshot_snapshotId_assetClassId_key" ON "PortfolioClassSnapshot"("snapshotId", "assetClassId");

-- CreateIndex
CREATE INDEX "PortfolioAssetSnapshot_assetId_idx" ON "PortfolioAssetSnapshot"("assetId");

-- CreateIndex
CREATE INDEX "PortfolioAssetSnapshot_accountId_idx" ON "PortfolioAssetSnapshot"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioAssetSnapshot_snapshotId_assetId_accountId_key" ON "PortfolioAssetSnapshot"("snapshotId", "assetId", "accountId");

-- CreateIndex
CREATE INDEX "PortfolioItem_accountId_idx" ON "PortfolioItem"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioItem_assetId_accountId_key" ON "PortfolioItem"("assetId", "accountId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assetClassId_fkey" FOREIGN KEY ("assetClassId") REFERENCES "AssetClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEvent" ADD CONSTRAINT "IncomeEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEvent" ADD CONSTRAINT "IncomeEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationTarget" ADD CONSTRAINT "AllocationTarget_assetClassId_fkey" FOREIGN KEY ("assetClassId") REFERENCES "AssetClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioClassSnapshot" ADD CONSTRAINT "PortfolioClassSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PortfolioSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioClassSnapshot" ADD CONSTRAINT "PortfolioClassSnapshot_assetClassId_fkey" FOREIGN KEY ("assetClassId") REFERENCES "AssetClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAssetSnapshot" ADD CONSTRAINT "PortfolioAssetSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PortfolioSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAssetSnapshot" ADD CONSTRAINT "PortfolioAssetSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioAssetSnapshot" ADD CONSTRAINT "PortfolioAssetSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
