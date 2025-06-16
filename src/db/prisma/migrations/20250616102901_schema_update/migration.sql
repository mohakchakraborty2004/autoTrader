/*
  Warnings:

  - You are about to drop the column `tokenId` on the `userWatch` table. All the data in the column will be lost.
  - Added the required column `tokenAddress` to the `userWatch` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "userWatch" DROP CONSTRAINT "userWatch_tokenId_fkey";

-- AlterTable
ALTER TABLE "userWatch" DROP COLUMN "tokenId",
ADD COLUMN     "tokenAddress" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "userWatch" ADD CONSTRAINT "userWatch_tokenAddress_fkey" FOREIGN KEY ("tokenAddress") REFERENCES "token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
