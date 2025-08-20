/*
  Warnings:

  - You are about to drop the column `numeric` on the `Country` table. All the data in the column will be lost.
  - The `regionCode` column on the `Country` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `subRegionCode` column on the `Country` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `countryCode` to the `Country` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Country" DROP COLUMN "numeric",
ADD COLUMN     "countryCode" INTEGER NOT NULL,
DROP COLUMN "regionCode",
ADD COLUMN     "regionCode" INTEGER,
DROP COLUMN "subRegionCode",
ADD COLUMN     "subRegionCode" INTEGER;
