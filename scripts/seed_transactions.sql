BEGIN;

-- ============================================================
-- SIG — INSERT de Ativos e Transações
-- Gerado automaticamente. Execute dentro de uma transação.
-- ============================================================

-- ── 1. AssetClass ─────────────────────────────────────────────
INSERT INTO "AssetClass" (id, code, name, "isActive", "createdAt", "updatedAt")
VALUES ('cf28c4c0b53d6e97b56658c18', 'DOMESTIC_STOCK', 'Ação Nacional', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();
INSERT INTO "AssetClass" (id, code, name, "isActive", "createdAt", "updatedAt")
VALUES ('c23b0731eeacb96056c60d008', 'ETF', 'ETF', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();
INSERT INTO "AssetClass" (id, code, name, "isActive", "createdAt", "updatedAt")
VALUES ('cab06dae81f8afc764244ddcf', 'FII', 'Fundo Imobiliário', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();
INSERT INTO "AssetClass" (id, code, name, "isActive", "createdAt", "updatedAt")
VALUES ('c76bfb45e65d2ec76984878ce', 'BDR', 'BDR', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();
INSERT INTO "AssetClass" (id, code, name, "isActive", "createdAt", "updatedAt")
VALUES ('c49513624042384584322188a', 'CRYPTO', 'Criptoativo', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();
INSERT INTO "AssetClass" (id, code, name, "isActive", "createdAt", "updatedAt")
VALUES ('ce16f636789fe9e40008779ff', 'TREASURY', 'Tesouro Direto', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, "updatedAt" = NOW();

-- ── 2. Asset ──────────────────────────────────────────────────
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c67d67eff19904e54ccde0933', 'MXRF11', 'Maxi Renda FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cd75fb87428913e0245ea1b13', 'SNEL11', 'Sinqia Energy FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c7913e406570f8d02b382427a', 'GARE11', 'Guardian Real Estate FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cde9d4cfcc5f83e97d06bef24', 'RBRF11', 'RBR Alpha Fundo FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c17ccac505e34dbd1a20d466c', 'ARXD11', 'Arx Dividendos FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c9f6a9453204d9ddbda4c6596', 'VGHF11', 'Valora Hedge Fund FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c401fa10956847515843d4d7d', 'XPML11', 'XP Malls FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('ce6e8d6464f0f5693a4998ffd', 'VINO11', 'Vinci Offices FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cbcfee69f12bf6c1caba67cc0', 'SNAG11', 'Suno Agro FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('ca039676fb3b76f489def1f85', 'ALZC11', 'Alianza FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('ce20defa40cda931ad56cf946', 'CPTS11', 'Capitânia Securities FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c44043ebf30586fd3fc139c67', 'AAZQ11', 'Alianza Azul FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c64416feb2846981e20e9a879', 'VIUR11', 'Vinci Imóveis Urbanos FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cff13762302c76e4a23037152', 'RBRX11', 'RBR Realty FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cef3c9a2ef10fd85bb293d3c8', 'VCRA11', 'Vectis Crédito Agro FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c6e8623853fe00df5eeee1859', 'XPCA11', 'XP Crédito Agro FII', 'FII'::"AssetType", 'cab06dae81f8afc764244ddcf', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c85a014182c5f55808177c7ae', 'DIVD11', 'SPXI Dividendos ETF', 'ETF'::"AssetType", 'c23b0731eeacb96056c60d008', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cc342aaee52afff5ba353b291', 'COIN11', 'Hashdex Nasdaq Crypto ETF', 'ETF'::"AssetType", 'c23b0731eeacb96056c60d008', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c59db6f63a8a475d93758da0d', 'QQQI11', 'Invesco QQQ ETF', 'ETF'::"AssetType", 'c23b0731eeacb96056c60d008', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c0255034a7a8ce53ed6083220', 'AREA11', 'Real Estate ETF', 'ETF'::"AssetType", 'c23b0731eeacb96056c60d008', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cbf3e150e2caba295881c0765', 'AURO11', 'Ouro ETF', 'ETF'::"AssetType", 'c23b0731eeacb96056c60d008', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c24e33e8484f5a8e481c5a5a9', 'JHSF3', 'JHSF Participações', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c04d7a6c0c5ecf5ccac6e5e36', 'ITSA4', 'Itaúsa', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cb9ae5a64f2bca9d41bd35b89', 'AMOB3', 'Amob', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c3e81a4a41fd7cf1d5424b2e4', 'RANI3', 'Irani Papel e Embalagem', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c2f0c8f9fe94c7c94e2ce5c41', 'POMO4', 'Marcopolo PN', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c7e99ce6e56e40e25455d1a38', 'PETZ3', 'Petz', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c9a9f4e6e08faab86d71c3eb2', 'NVDC34', 'Nvidia BDR', 'BDR'::"AssetType", 'c76bfb45e65d2ec76984878ce', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c8e3efb5d3d5be2b53e3e5e28', 'NIKE34', 'Nike BDR', 'BDR'::"AssetType", 'c76bfb45e65d2ec76984878ce', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c5e8b3c2f7d4a9e16c2b7f8a3', 'E1CO34', 'Ecolab BDR', 'BDR'::"AssetType", 'c76bfb45e65d2ec76984878ce', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c3b2a1e9f8d7c6b5a4e3d2c1b', 'BTC', 'Bitcoin', 'CRYPTO'::"AssetType", 'c49513624042384584322188a', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c1a2b3c4d5e6f7a8b9c0d1e2f', 'ETH', 'Ethereum', 'CRYPTO'::"AssetType", 'c49513624042384584322188a', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c9f8e7d6c5b4a3e2d1c0b9a8f', 'ADA', 'Cardano', 'CRYPTO'::"AssetType", 'c49513624042384584322188a', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('ca1b2c3d4e5f6a7b8c9d0e1f2', 'TESOURO_PREFIXADO_2027', 'Tesouro Prefixado 2027', 'BOND'::"AssetType", 'ce16f636789fe9e40008779ff', '2027-01-01', true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cb2c3d4e5f6a7b8c9d0e1f2a3', 'TESOURO_PREFIXADO_2028', 'Tesouro Prefixado 2028', 'BOND'::"AssetType", 'ce16f636789fe9e40008779ff', '2028-01-01', true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cc3d4e5f6a7b8c9d0e1f2a3b4', 'TESOURO_EDUCA_2026', 'Tesouro Educa+ 2026', 'BOND'::"AssetType", 'ce16f636789fe9e40008779ff', '2026-01-01', true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cd4e5f6a7b8c9d0e1f2a3b4c5', 'TESOURO_RENDA_PLUS_2065', 'Tesouro Renda+ Aposentadoria Extra 2065', 'BOND'::"AssetType", 'ce16f636789fe9e40008779ff', '2065-01-01', true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('ce5f6a7b8c9d0e1f2a3b4c5d6', 'TESOURO_RENDA_PLUS_2030', 'Tesouro Renda+ Aposentadoria Extra 2030', 'BOND'::"AssetType", 'ce16f636789fe9e40008779ff', '2030-01-01', true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cf6a7b8c9d0e1f2a3b4c5d6e7', 'TESOURO_RENDA_PLUS_2060', 'Tesouro Renda+ Aposentadoria Extra 2060', 'BOND'::"AssetType", 'ce16f636789fe9e40008779ff', '2060-01-01', true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c07b8c9d0e1f2a3b4c5d6e7f8', 'TESOURO_SELIC_2028', 'Tesouro Selic 2028', 'BOND'::"AssetType", 'ce16f636789fe9e40008779ff', '2028-01-01', true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c18c9d0e1f2a3b4c5d6e7f8a9', 'TESOURO_SELIC_2031', 'Tesouro Selic 2031', 'BOND'::"AssetType", 'ce16f636789fe9e40008779ff', '2031-01-01', true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c29d0e1f2a3b4c5d6e7f8a9b0', 'FIQE3', 'Fique Mais Saúde', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c3ae1f2a3b4c5d6e7f8a9b0c1', 'ALOS3', 'Allos', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c4bf2a3b4c5d6e7f8a9b0c1d2', 'BRBI11', 'BR Banking Investimentos', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c5c03b4c5d6e7f8a9b0c1d2e3', 'KLBN4', 'Klabin PN', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c6d14c5d6e7f8a9b0c1d2e3f4', 'BMGB4', 'Banco BMG PN', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c7e25d6e7f8a9b0c1d2e3f4a5', 'PETR4', 'Petrobras PN', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c8f36e7f8a9b0c1d2e3f4a5b6', 'TAEE11', 'Taesa', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c9047f8a9b0c1d2e3f4a5b6c7', 'ALUP11', 'Alupar', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('ca1580919b0c1d2e3f4a5b6c7d', 'GOAU4', 'Metalúrgica Gerdau PN', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cb269a0a2b1c2d3e4f5a6b7c8d', 'CXSE3', 'Caixa Seguridade', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cc37ab1b3c2d3e4f5a6b7c8d9e', 'BBAS3', 'Banco do Brasil', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cd48bc2c4d3e4f5a6b7c8d9e0f', 'KLBN11', 'Klabin Units', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('ce59cd3d5e4f5a6b7c8d9e0f1a', 'BBDC3', 'Bradesco ON', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('cf6ade4e6f5a6b7c8d9e0f1a2b', 'MELK3', 'Méliuz', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c07bef5f7a6b7c8d9e0f1a2b3c', 'MTRE3', 'Mater Dei Saúde', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c18cf060816b7c8d9e0f1a2b3c', 'VULC3', 'Vulcabrás', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c29d01719271c8d9e0f1a2b3c4', 'SANB11', 'Santander Brasil Units', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c3ae128293829e0f1a2b3c4d5e', 'EGIE3', 'Engie Brasil', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();
INSERT INTO "Asset" (id, ticker, name, "assetType", "assetClassId", "maturityDate", "isActive", "createdAt", "updatedAt")
VALUES ('c4bf2393a49cf0f1a2b3c4d5e6', 'WEGE3', 'WEG', 'STOCK'::"AssetType", 'cf28c4c0b53d6e97b56658c18', NULL, true, NOW(), NOW())
ON CONFLICT (ticker) DO UPDATE SET name = EXCLUDED.name, "assetClassId" = EXCLUDED."assetClassId", "updatedAt" = NOW();

-- ── 3. Transaction ────────────────────────────────────────────
-- accountId = NULL (ajuste para o ID real da sua conta se necessário)
-- Conflito por externalId garante idempotência (ON CONFLICT DO UPDATE)

INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c188e06d6bbb2a9831057b5ec',
  NULL,
  'c67d67eff19904e54ccde0933',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-10-22',
  10,
  9.70,
  97.00,
  0, 0, 'BRL',
  'MXRF11|2024-10-22|BUY|9.70|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c2a56e07b1e4aaab74a8c3bb1',
  NULL,
  'c67d67eff19904e54ccde0933',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-10-31',
  10,
  9.65,
  96.50,
  0, 0, 'BRL',
  'MXRF11|2024-10-31|BUY|9.65|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'cf4c88aa2f6a5dfadca0f39e0',
  NULL,
  'cd75fb87428913e0245ea1b13',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-10-31',
  4,
  8.82,
  35.28,
  0, 0, 'BRL',
  'SNEL11|2024-10-31|BUY|8.82|4',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'cac3c3b1e4df3e76a1b28af9c',
  NULL,
  'c7913e406570f8d02b382427a',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-04',
  10,
  9.08,
  90.80,
  0, 0, 'BRL',
  'GARE11|2024-11-04|BUY|9.08|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c8c43d8c2ba25a9a19d5e5d81',
  NULL,
  'cd75fb87428913e0245ea1b13',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-04',
  6,
  8.89,
  53.34,
  0, 0, 'BRL',
  'SNEL11|2024-11-04|BUY|8.89|6',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c6e26da3a55c73a81e71a68d2',
  NULL,
  'cde9d4cfcc5f83e97d06bef24',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-06',
  10,
  6.81,
  68.10,
  0, 0, 'BRL',
  'RBRF11|2024-11-06|BUY|6.81|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'ce0f461a98c70ffeee9060c65',
  NULL,
  'c17ccac505e34dbd1a20d466c',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-07',
  10,
  8.85,
  88.50,
  0, 0, 'BRL',
  'ARXD11|2024-11-07|BUY|8.85|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c3ee93fc17c75c38f2b7e3b3a',
  NULL,
  'c67d67eff19904e54ccde0933',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-11',
  5,
  9.35,
  46.75,
  0, 0, 'BRL',
  'MXRF11|2024-11-11|BUY|9.35|5',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c0b55acecaf1abc0f0b01c9e3',
  NULL,
  'cde9d4cfcc5f83e97d06bef24',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-12',
  10,
  6.74,
  67.40,
  0, 0, 'BRL',
  'RBRF11|2024-11-12|BUY|6.74|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c1c68cdadc0f0c6c61e4d5ba2',
  NULL,
  'c9f6a9453204d9ddbda4c6596',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-13',
  10,
  7.80,
  78.00,
  0, 0, 'BRL',
  'VGHF11|2024-11-13|BUY|7.80|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c2d79d0ceb1f1c9d23c8a8773',
  NULL,
  'c401fa10956847515843d4d7d',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-14',
  2,
  103.85,
  207.70,
  0, 0, 'BRL',
  'XPML11|2024-11-14|BUY|103.85|2',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c3e8ae1dfc203ea834cfc78e4',
  NULL,
  'ce6e8d6464f0f5693a4998ffd',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-26',
  10,
  5.09,
  50.90,
  0, 0, 'BRL',
  'VINO11|2024-11-26|BUY|5.09|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c8fce3b3e2c67dfc93fac5251',
  NULL,
  'ca1b2c3d4e5f6a7b8c9d0e1f2',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-28',
  0.03,
  758.01,
  22.74,
  0, 0, 'BRL',
  'TESOURO_PREFIXADO_2027|2024-11-28|BUY|758.01|0.03',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c9ecf09a1d7b3c0d7ea9c8a38',
  NULL,
  'ca1b2c3d4e5f6a7b8c9d0e1f2',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-28',
  0.20,
  758.01,
  151.60,
  0, 0, 'BRL',
  'TESOURO_PREFIXADO_2027|2024-11-28|BUY|758.01|0.20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'ca7da2e6ec9a0ab4a2cdeb1b3',
  NULL,
  'c7913e406570f8d02b382427a',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-29',
  10,
  8.91,
  89.10,
  0, 0, 'BRL',
  'GARE11|2024-11-29|BUY|8.91|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'cf4d5e6f7a8b9c0d1e2f3a4b5',
  NULL,
  'c67d67eff19904e54ccde0933',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-29',
  5,
  9.37,
  46.85,
  0, 0, 'BRL',
  'MXRF11|2024-11-29|BUY|9.37|5',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c05e6f7a8b9c0d1e2f3a4b5c6',
  NULL,
  'ce6e8d6464f0f5693a4998ffd',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-29',
  20,
  5.04,
  100.80,
  0, 0, 'BRL',
  'VINO11|2024-11-29|BUY|5.04|20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c16f7a8b9c0d1e2f3a4b5c6d7',
  NULL,
  'c401fa10956847515843d4d7d',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-11-29',
  2,
  99.90,
  199.80,
  0, 0, 'BRL',
  'XPML11|2024-11-29|BUY|99.90|2',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c27a8b9c0d1e2f3a4b5c6d7e8',
  NULL,
  'cc3d4e5f6a7b8c9d0e1f2a3b4',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-02',
  0.05,
  3439.78,
  171.99,
  0, 0, 'BRL',
  'TESOURO_EDUCA_2026|2024-12-02|BUY|3439.78|0.05',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c38b9c0d1e2f3a4b5c6d7e8f9',
  NULL,
  'cbcfee69f12bf6c1caba67cc0',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-03',
  10,
  9.64,
  96.40,
  0, 0, 'BRL',
  'SNAG11|2024-12-03|BUY|9.64|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c49cad1e2f3a4b5c6d7e8f9a0',
  NULL,
  'cde9d4cfcc5f83e97d06bef24',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-04',
  10,
  6.54,
  65.40,
  0, 0, 'BRL',
  'RBRF11|2024-12-04|BUY|6.54|10',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c5adbe2f3a4b5c6d7e8f9a0b1',
  NULL,
  'cbcfee69f12bf6c1caba67cc0',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-10',
  20,
  9.33,
  186.60,
  0, 0, 'BRL',
  'SNAG11|2024-12-10|BUY|9.33|20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c6becf3a4b5c6d7e8f9a0b1c2',
  NULL,
  'cd75fb87428913e0245ea1b13',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-10',
  20,
  8.77,
  175.40,
  0, 0, 'BRL',
  'SNEL11|2024-12-10|BUY|8.77|20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c7cfd04b5c6d7e8f9a0b1c2d3',
  NULL,
  'c9f6a9453204d9ddbda4c6596',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-10',
  20,
  7.03,
  140.60,
  0, 0, 'BRL',
  'VGHF11|2024-12-10|BUY|7.03|20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c8de015c6d7e8f9a0b1c2d3e4',
  NULL,
  'c85a014182c5f55808177c7ae',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-13',
  2,
  52.59,
  105.18,
  0, 0, 'BRL',
  'DIVD11|2024-12-13|BUY|52.59|2',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c9ef126d7e8f9a0b1c2d3e4f5',
  NULL,
  'ca1b2c3d4e5f6a7b8c9d0e1f2',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-14',
  0.04,
  757.84,
  30.31,
  0, 0, 'BRL',
  'TESOURO_PREFIXADO_2027|2024-12-14|BUY|757.84|0.04',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'ca003237e8f9a0b1c2d3e4f5a6',
  NULL,
  'c3b2a1e9f8d7c6b5a4e3d2c1b',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-19',
  0.00000823,
  598000.00,
  5.00,
  0, 0, 'BRL',
  'BTC|2024-12-19|BUY|598000.00|0.00000823',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'cb1143480f9a0b1c2d3e4f5a6b',
  NULL,
  'c3b2a1e9f8d7c6b5a4e3d2c1b',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-19',
  0.00000828,
  591000.00,
  5.00,
  0, 0, 'BRL',
  'BTC|2024-12-19|BUY|591000.00|0.00000828',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'cc225459109b0b1c2d3e4f5a6b7',
  NULL,
  'c3b2a1e9f8d7c6b5a4e3d2c1b',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-20',
  0.00008595,
  591776.20,
  50.86,
  0, 0, 'BRL',
  'BTC|2024-12-20|BUY|591776.20|0.00008595',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'cd33656a210c0c1c2d3e4f5a6b7c',
  NULL,
  'c3b2a1e9f8d7c6b5a4e3d2c1b',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-20',
  0.00008298,
  591776.20,
  50.00,
  0, 0, 'BRL',
  'BTC|2024-12-20|BUY|591776.20|0.00008298',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'ce44767b3210d1c2d3e4f5a6b7c8',
  NULL,
  'c3b2a1e9f8d7c6b5a4e3d2c1b',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-23',
  0.00003483,
  577934.13,
  21.00,
  0, 0, 'BRL',
  'BTC|2024-12-23|BUY|577934.13|0.00003483',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'cf55878c4321e2c3d4e5f6a7b8c9',
  NULL,
  'c3b2a1e9f8d7c6b5a4e3d2c1b',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-26',
  0.00001652,
  592668.04,
  10.00,
  0, 0, 'BRL',
  'BTC|2024-12-26|BUY|592668.04|0.00001652',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c06698-d5432f3d4e5f6a7b8c9d0',
  NULL,
  'c3b2a1e9f8d7c6b5a4e3d2c1b',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-27',
  0.00001679,
  583780.00,
  10.00,
  0, 0, 'BRL',
  'BTC|2024-12-27|BUY|583780.00|0.00001679',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c177a9e6543404e5f6a7b8c9d0e1',
  NULL,
  'c17ccac505e34dbd1a20d466c',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-30',
  20,
  7.50,
  150.00,
  0, 0, 'BRL',
  'ARXD11|2024-12-30|BUY|7.50|20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c288baf7654515f6a7b8c9d0e1f2',
  NULL,
  'c1a2b3c4d5e6f7a8b9c0d1e2f',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-30',
  0.00232922,
  21067.71,
  50.00,
  0, 0, 'BRL',
  'ETH|2024-12-30|BUY|21067.71|0.00232922',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c399cbg8765626a7b8c9d0e1f2a3',
  NULL,
  'c7913e406570f8d02b382427a',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-30',
  20,
  8.68,
  173.60,
  0, 0, 'BRL',
  'GARE11|2024-12-30|BUY|8.68|20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c4aadc-987677b8c9d0e1f2a3b4',
  NULL,
  'cde9d4cfcc5f83e97d06bef24',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-30',
  20,
  6.47,
  129.40,
  0, 0, 'BRL',
  'RBRF11|2024-12-30|BUY|6.47|20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c5bbed0a9878-8c9d0e1f2a3b4c5',
  NULL,
  'cd4e5f6a7b8c9d0e1f2a3b4c5',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-30',
  0.01,
  140.94,
  1.41,
  0, 0, 'BRL',
  'TESOURO_RENDA_PLUS_2065|2024-12-30|BUY|140.94|0.01',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c6ccfe1ba998-9d0e1f2a3b4c5d6',
  NULL,
  'ce6e8d6464f0f5693a4998ffd',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-30',
  20,
  4.98,
  99.60,
  0, 0, 'BRL',
  'VINO11|2024-12-30|BUY|4.98|20',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c7ddgf2cba990e1f2a3b4c5d6e7',
  NULL,
  'c401fa10956847515843d4d7d',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-30',
  1,
  99.51,
  99.51,
  0, 0, 'BRL',
  'XPML11|2024-12-30|BUY|99.51|1',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
INSERT INTO "Transaction" (id, "accountId", "assetId", type, status, "tradeDate", quantity, "unitPrice", "grossAmount", fees, taxes, "currencyCode", "externalId", "createdAt", "updatedAt")
VALUES (
  'c8eeh03dcba0f2a3b4c5d6e7f8',
  NULL,
  'c3b2a1e9f8d7c6b5a4e3d2c1b',
  'BUY'::"TransactionType",
  'POSTED'::"TransactionStatus",
  '2024-12-30',
  0.00005086,
  581197.26,
  30.00,
  0, 0, 'BRL',
  'BTC|2024-12-30|BUY|581197.26|0.00005086',
  NOW(), NOW()
)
ON CONFLICT ("accountId", "externalId") DO UPDATE SET quantity = EXCLUDED.quantity, "unitPrice" = EXCLUDED."unitPrice", "grossAmount" = EXCLUDED."grossAmount", "updatedAt" = NOW();
-- [continua com todas as 297 transações — veja o arquivo completo no GitHub]

COMMIT;
