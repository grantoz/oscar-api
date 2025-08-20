-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super', 'admin', 'staff', 'user');

-- CreateTable
CREATE TABLE "Post" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "userId" BIGINT NOT NULL,
    "extId" CHAR(26),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" VARCHAR(255),
    "phone" VARCHAR(255),
    "salt" VARCHAR(32),
    "hash" VARCHAR(255),
    "props" JSONB,
    "role" "Role" NOT NULL DEFAULT 'user',
    "extId" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "Country" (
    "id" VARCHAR(2) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "alpha3" VARCHAR(3) NOT NULL,
    "countryCode" INTEGER NOT NULL,
    "region" VARCHAR(255),
    "subRegion" VARCHAR(255),
    "regionCode" INTEGER,
    "subRegionCode" INTEGER,
    "extId" CHAR(26)
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_id_key" ON "Post"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Post_extId_key" ON "Post"("extId");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_extId_key" ON "User"("extId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_id_key" ON "Country"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Country_extId_key" ON "Country"("extId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
