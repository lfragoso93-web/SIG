/*
  Warnings:

  - A unique constraint covering the columns `[assetId,externalId]` on the table `IncomeEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "IncomeStatus" AS ENUM ('ANNOUNCED', 'CONFIRMED', 'PAID', 'CANCELED');

-- AlterEnum
ALTER TYPE "IncomeType" ADD VALUE 'SUBSCRIPTION_RIGHT';

-- AlterTable
ALTER TABLE "IncomeEvent" ADD COLUMN     "description" TEXT,
ADD COLUMN     "externalId" VARCHAR(150),
ADD COLUMN     "importedFrom" VARCHAR(100),
ADD COLUMN     "status" "IncomeStatus" NOT NULL DEFAULT 'CONFIRMED',
ALTER COLUMN "paymentDate" DROP NOT NULL,
ALTER COLUMN "grossAmount" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "income_event_asset_externalId_unique" ON "IncomeEvent"("assetId", "externalId");
