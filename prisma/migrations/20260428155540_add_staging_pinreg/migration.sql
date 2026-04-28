-- CreateTable
CREATE TABLE "StagingPinreg" (
    "vardas" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StagingPinreg_pkey" PRIMARY KEY ("vardas")
);
