-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('super', 'admin', 'staff', 'user');

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" TEXT NOT NULL,
    "name" VARCHAR(255),
    "phone" VARCHAR(255),
    "salt" VARCHAR(32),
    "hash" VARCHAR(255),
    "props" JSONB,
    "role" "public"."Role" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "public"."Country" (
    "id" VARCHAR(2) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "alpha3" VARCHAR(3) NOT NULL,
    "countryCode" INTEGER NOT NULL,
    "region" VARCHAR(255),
    "subRegion" VARCHAR(255),
    "regionCode" INTEGER,
    "subRegionCode" INTEGER
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_id_key" ON "public"."Post"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "public"."User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Country_id_key" ON "public"."Country"("id");

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
