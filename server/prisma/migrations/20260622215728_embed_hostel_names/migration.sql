/*
  Warnings:

  - You are about to drop the column `facilities` on the `Hostel` table. All the data in the column will be lost.
  - Changed the type of `name` on the `Hostel` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "HostelName" AS ENUM ('LOHIT_HOSTEL', 'DISANG_HOSTEL', 'SUBANSIRI_HOSTEL', 'UMIAM_HOSTEL', 'DHANSIRI_HOSTEL', 'MANAS_HOSTEL', 'KAMENG_HOSTEL', 'GAURANG_HOSTEL', 'BARAK_HOSTEL', 'BRAHMAPUTRA_HOSTEL', 'DIHING_HOSTEL', 'KAPILI_HOSTEL', 'SIANG_HOSTEL', 'MARRIED_SCHOLAR_HOSTEL');

-- AlterTable
ALTER TABLE "Hostel" DROP COLUMN "facilities",
DROP COLUMN "name",
ADD COLUMN     "name" "HostelName" NOT NULL;
