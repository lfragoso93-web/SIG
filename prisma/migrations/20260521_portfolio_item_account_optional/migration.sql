-- Torna accountId opcional em PortfolioItem
-- Remove FK constraint antiga, altera coluna para nullable, recria FK opcional

ALTER TABLE "PortfolioItem" DROP CONSTRAINT IF EXISTS "PortfolioItem_accountId_fkey";

ALTER TABLE "PortfolioItem" ALTER COLUMN "accountId" DROP NOT NULL;

ALTER TABLE "PortfolioItem"
  ADD CONSTRAINT "PortfolioItem_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id")
  ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
