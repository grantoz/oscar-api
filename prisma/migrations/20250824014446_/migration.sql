/*
  Warnings:

  - You are about to drop the column `extId` on the `Country` table. All the data in the column will be lost.
  - The `extId` column on the `Post` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "Country_extId_key";

-- AlterTable
ALTER TABLE "Country" DROP COLUMN "extId";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "extId",
ADD COLUMN     "extId" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "Post_extId_key" ON "Post"("extId");
