-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id"           TEXT NOT NULL,
    "username"     VARCHAR(80) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "displayName"  VARCHAR(120),
    "role"         "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");
