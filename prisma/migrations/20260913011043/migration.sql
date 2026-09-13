/*
  Warnings:

  - A unique constraint covering the columns `[seedKey]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "seedKey" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "User_seedKey_key" ON "User"("seedKey") WHERE ("seedKey" IS NOT NULL);
