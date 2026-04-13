-- CreateTable
CREATE TABLE "StagingAsmuo" (
    "jarKodas" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StagingAsmuo_pkey" PRIMARY KEY ("jarKodas")
);

-- CreateTable
CREATE TABLE "StagingSutartis" (
    "sutartiesUnikalusID" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StagingSutartis_pkey" PRIMARY KEY ("sutartiesUnikalusID")
);

-- CreateTable
CREATE TABLE "StagingPirkimas" (
    "pirkimoId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StagingPirkimas_pkey" PRIMARY KEY ("pirkimoId")
);
