/*
  Warnings:

  - Made the column `props` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "props" SET NOT NULL;
