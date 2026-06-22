/*
  Warnings:

  - You are about to drop the column `messTimings` on the `Hostel` table. All the data in the column will be lost.
  - You are about to drop the column `rules` on the `Hostel` table. All the data in the column will be lost.
  - You are about to drop the column `wardenContact` on the `Hostel` table. All the data in the column will be lost.
  - You are about to drop the column `wardenEmail` on the `Hostel` table. All the data in the column will be lost.
  - You are about to drop the column `wardenName` on the `Hostel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Hostel" DROP COLUMN "messTimings",
DROP COLUMN "rules",
DROP COLUMN "wardenContact",
DROP COLUMN "wardenEmail",
DROP COLUMN "wardenName";
