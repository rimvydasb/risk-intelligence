-- CreateTable
CREATE TABLE "staging_sutartis_list" (
    "id" TEXT NOT NULL,
    "buyerCode" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "contracts" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staging_sutartis_list_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staging_sutartis_list_buyerCode_supplierCode_key" ON "staging_sutartis_list"("buyerCode", "supplierCode");
