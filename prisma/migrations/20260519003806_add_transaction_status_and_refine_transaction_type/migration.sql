/*
  Warnings:

  - The values [DIVIDEND,INTEREST] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('POSTED', 'PENDING', 'CANCELED');

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAW', 'FEE', 'TAX', 'TRANSFER_IN', 'TRANSFER_OUT', 'SPLIT', 'REVERSE_SPLIT', 'BONUS', 'AMORTIZATION', 'OTHER');
ALTER TABLE "Transaction" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED';
