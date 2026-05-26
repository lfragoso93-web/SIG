-- Migration: add fixed-income specific fields to Asset
-- fgcProtected : cobertura FGC (CDB, LCI, LCA)
-- irExempt     : isento de IR (LCI, LCA, CRI, CRA)
-- liquidityDays: 0 = liquidez diária | null = só no vencimento | N = carência em dias

ALTER TABLE "Asset"
  ADD COLUMN IF NOT EXISTS "fgcProtected"  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "irExempt"      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "liquidityDays" INTEGER;
