/*
  Warnings:

  - A unique constraint covering the columns `[extId]` on the table `Country` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Country" ADD COLUMN     "extId" CHAR(26);

-- CreateIndex
CREATE UNIQUE INDEX "Country_extId_key" ON "Country"("extId");
