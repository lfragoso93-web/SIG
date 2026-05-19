BEGIN;

-- 1) Renomeia a classe antiga STOCK para DOMESTIC_STOCK
UPDATE "AssetClass"
SET
  "code" = 'DOMESTIC_STOCK',
  "name" = 'Ação Nacional',
  "updatedAt" = NOW()
WHERE "code" = 'STOCK';

-- 2) Cria a classe STOCK para ação internacional
INSERT INTO "AssetClass" (
  "id",
  "code",
  "name",
  "targetPercentage",
  "description",
  "displayOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'assetclass_stock_international',
  'STOCK',
  'Ação Internacional',
  NULL,
  'Ações internacionais individuais',
  15,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "AssetClass" WHERE "code" = 'STOCK'
);

-- 3) Cria a classe INTERNATIONAL_ETF
INSERT INTO "AssetClass" (
  "id",
  "code",
  "name",
  "targetPercentage",
  "description",
  "displayOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'assetclass_international_etf',
  'INTERNATIONAL_ETF',
  'ETF Internacional',
  NULL,
  'ETFs listados no exterior',
  25,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "AssetClass" WHERE "code" = 'INTERNATIONAL_ETF'
);

-- 4) Move EXTERIOR + ETF para INTERNATIONAL_ETF
UPDATE "Asset" a
SET
  "assetClassId" = ac_new."id",
  "updatedAt" = NOW()
FROM "AssetClass" ac_old
JOIN "AssetClass" ac_new
  ON ac_new."code" = 'INTERNATIONAL_ETF'
WHERE a."assetClassId" = ac_old."id"
  AND ac_old."code" = 'EXTERIOR'
  AND a."assetType" = 'ETF';

-- 5) Move EXTERIOR + demais tipos para STOCK
UPDATE "Asset" a
SET
  "assetClassId" = ac_new."id",
  "updatedAt" = NOW()
FROM "AssetClass" ac_old
JOIN "AssetClass" ac_new
  ON ac_new."code" = 'STOCK'
WHERE a."assetClassId" = ac_old."id"
  AND ac_old."code" = 'EXTERIOR'
  AND a."assetType" <> 'ETF';

-- 6) Segurança extra: qualquer resíduo de EXTERIOR vai para STOCK
UPDATE "Asset" a
SET
  "assetClassId" = ac_new."id",
  "updatedAt" = NOW()
FROM "AssetClass" ac_old
JOIN "AssetClass" ac_new
  ON ac_new."code" = 'STOCK'
WHERE a."assetClassId" = ac_old."id"
  AND ac_old."code" = 'EXTERIOR';

-- 7) Remove targets antigos de EXTERIOR
DELETE FROM "AllocationTarget"
WHERE "assetClassId" IN (
  SELECT "id" FROM "AssetClass" WHERE "code" = 'EXTERIOR'
);

-- 8) Reclassifica snapshots históricos de EXTERIOR para STOCK
UPDATE "PortfolioClassSnapshot" pcs
SET
  "assetClassId" = ac_new."id",
  "updatedAt" = NOW()
FROM "AssetClass" ac_old
JOIN "AssetClass" ac_new
  ON ac_new."code" = 'STOCK'
WHERE pcs."assetClassId" = ac_old."id"
  AND ac_old."code" = 'EXTERIOR';

-- 9) Remove a classe EXTERIOR
DELETE FROM "AssetClass"
WHERE "code" = 'EXTERIOR';

COMMIT;