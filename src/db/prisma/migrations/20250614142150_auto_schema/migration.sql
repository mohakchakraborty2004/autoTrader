/*
  Warnings:

  - Added the required column `privateKey` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "privateKey" TEXT NOT NULL;
