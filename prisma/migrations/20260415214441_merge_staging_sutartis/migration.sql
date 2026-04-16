/*
  Warnings:

  - You are about to drop the `staging_sutartis_list` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `buyerCode` to the `StagingSutartis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `StagingSutartis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplierCode` to the `StagingSutartis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StagingSutartis" ADD COLUMN     "buyerCode" TEXT NOT NULL,
ADD COLUMN     "dataFetchedAt" TIMESTAMP(3),
ADD COLUMN     "fromDate" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "supplierCode" TEXT NOT NULL,
ADD COLUMN     "tillDate" TEXT,
ADD COLUMN     "value" DOUBLE PRECISION,
ALTER COLUMN "data" DROP NOT NULL;

-- DropTable
DROP TABLE "staging_sutartis_list";

-- CreateIndex
CREATE INDEX "StagingSutartis_buyerCode_supplierCode_idx" ON "StagingSutartis"("buyerCode", "supplierCode");
