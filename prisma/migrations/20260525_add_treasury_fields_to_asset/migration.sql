-- Migration: adiciona campos de renda fixa / Tesouro Direto ao model Asset

ALTER TABLE "Asset"
  ADD COLUMN IF NOT EXISTS "maturityDate" DATE,
  ADD COLUMN IF NOT EXISTS "indexer"      VARCHAR(30);
