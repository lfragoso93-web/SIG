-- Migration: multi-tenant — adiciona userId em todas as tabelas financeiras
-- Estratégia segura em 3 passos para preservar dados existentes:
--   1. Adiciona coluna nullable
--   2. Popula com o id do primeiro ADMIN (seus dados atuais)
--   3. Torna NOT NULL + cria índices e constraints

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 1: Adiciona userId nullable nas tabelas financeiras
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Account"           ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Transaction"       ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "IncomeEvent"       ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "PortfolioItem"     ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "PortfolioSnapshot" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "AllocationTarget"  ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Adiciona email ao User (para futura integração OAuth)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" VARCHAR(150);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Muda role default de ADMIN para VIEWER (novos usuários são VIEWER por padrão)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 2: Popula userId com o id do primeiro ADMIN
--          Preserva 100% dos dados existentes vinculando-os ao admin
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  admin_id TEXT;
BEGIN
  SELECT id INTO admin_id FROM "User" WHERE role = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1;

  IF admin_id IS NOT NULL THEN
    UPDATE "Account"           SET "userId" = admin_id WHERE "userId" IS NULL;
    UPDATE "Transaction"       SET "userId" = admin_id WHERE "userId" IS NULL;
    UPDATE "IncomeEvent"       SET "userId" = admin_id WHERE "userId" IS NULL;
    UPDATE "PortfolioItem"     SET "userId" = admin_id WHERE "userId" IS NULL;
    UPDATE "PortfolioSnapshot" SET "userId" = admin_id WHERE "userId" IS NULL;
    UPDATE "AllocationTarget"  SET "userId" = admin_id WHERE "userId" IS NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PASSO 3: Torna NOT NULL + FK + índices
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Account"           ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Transaction"       ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "IncomeEvent"       ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PortfolioItem"     ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PortfolioSnapshot" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AllocationTarget"  ALTER COLUMN "userId" SET NOT NULL;

-- Foreign keys
ALTER TABLE "Account"           ADD CONSTRAINT "Account_userId_fkey"           FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction"       ADD CONSTRAINT "Transaction_userId_fkey"       FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncomeEvent"       ADD CONSTRAINT "IncomeEvent_userId_fkey"       FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortfolioItem"     ADD CONSTRAINT "PortfolioItem_userId_fkey"     FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AllocationTarget"  ADD CONSTRAINT "AllocationTarget_userId_fkey"  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove unique constraint antigo de Account (era sem userId)
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_name_institutionId_key";
-- Novo unique incluindo userId
CREATE UNIQUE INDEX IF NOT EXISTS "Account_userId_name_institutionId_key" ON "Account"("userId", "name", "institutionId");

-- Remove unique constraint antigo de Transaction
DROP INDEX IF EXISTS "transaction_account_externalId_unique";
-- Novo unique incluindo userId
CREATE UNIQUE INDEX IF NOT EXISTS "transaction_user_account_externalId_unique" ON "Transaction"("userId", "accountId", "externalId");

-- Remove unique constraint antigo de IncomeEvent
DROP INDEX IF EXISTS "income_event_asset_externalId_unique";
-- Novo unique incluindo userId
CREATE UNIQUE INDEX IF NOT EXISTS "income_event_user_asset_externalId_unique" ON "IncomeEvent"("userId", "assetId", "externalId");

-- Remove unique de PortfolioItem antigo e cria novo com userId
ALTER TABLE "PortfolioItem" DROP CONSTRAINT IF EXISTS "PortfolioItem_assetId_accountId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PortfolioItem_userId_assetId_accountId_key" ON "PortfolioItem"("userId", "assetId", "accountId");

-- Remove unique de PortfolioSnapshot antigo e cria novo com userId
ALTER TABLE "PortfolioSnapshot" DROP CONSTRAINT IF EXISTS "PortfolioSnapshot_referenceDate_period_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PortfolioSnapshot_userId_referenceDate_period_key" ON "PortfolioSnapshot"("userId", "referenceDate", "period");

-- Remove unique de AllocationTarget antigo e cria novo com userId
ALTER TABLE "AllocationTarget" DROP CONSTRAINT IF EXISTS "AllocationTarget_assetClassId_effectiveFrom_key";
CREATE UNIQUE INDEX IF NOT EXISTS "AllocationTarget_userId_assetClassId_effectiveFrom_key" ON "AllocationTarget"("userId", "assetClassId", "effectiveFrom");

-- Índices de performance
CREATE INDEX IF NOT EXISTS "Account_userId_idx"           ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_idx"       ON "Transaction"("userId", "tradeDate");
CREATE INDEX IF NOT EXISTS "IncomeEvent_userId_idx"       ON "IncomeEvent"("userId", "paymentDate");
CREATE INDEX IF NOT EXISTS "PortfolioItem_userId_idx"     ON "PortfolioItem"("userId");
CREATE INDEX IF NOT EXISTS "PortfolioSnapshot_userId_idx" ON "PortfolioSnapshot"("userId", "referenceDate");
CREATE INDEX IF NOT EXISTS "AllocationTarget_userId_idx"  ON "AllocationTarget"("userId");
