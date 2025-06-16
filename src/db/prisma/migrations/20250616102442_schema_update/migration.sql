/*
  Warnings:

  - A unique constraint covering the columns `[address]` on the table `token` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address` to the `token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "token" ADD COLUMN     "address" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "token_address_key" ON "token"("address");
