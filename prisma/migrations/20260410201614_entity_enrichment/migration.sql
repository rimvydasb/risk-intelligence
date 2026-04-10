-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "avgSalary" DOUBLE PRECISION,
ADD COLUMN     "dataAsOf" TIMESTAMP(3),
ADD COLUMN     "employeeCount" INTEGER,
ADD COLUMN     "legalForm" TEXT,
ADD COLUMN     "monthlyContributions" DOUBLE PRECISION,
ADD COLUMN     "registeredAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT,
ADD COLUMN     "statusSince" TIMESTAMP(3),
ADD COLUMN     "totalSalaryExpenses" DOUBLE PRECISION,
ADD COLUMN     "vehicleCount" INTEGER;

-- CreateTable
CREATE TABLE "SodraHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "employees" INTEGER NOT NULL,
    "avgSalary" DOUBLE PRECISION NOT NULL,
    "contributions" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SodraHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "court" TEXT NOT NULL,
    "roleInCase" TEXT NOT NULL,
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    "documentUrl" TEXT,

    CONSTRAINT "CourtRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementYear" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "asBuyerEur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "asSupplierEur" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ProcurementYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopCounterparty" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "counterpartyJar" TEXT NOT NULL,
    "counterpartyName" TEXT NOT NULL,
    "totalEur" DOUBLE PRECISION NOT NULL,
    "contractCount" INTEGER NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "TopCounterparty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SodraHistory_companyId_month_key" ON "SodraHistory"("companyId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CourtRecord_companyId_caseNumber_key" ON "CourtRecord"("companyId", "caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementYear_companyId_year_key" ON "ProcurementYear"("companyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "TopCounterparty_companyId_counterpartyJar_role_key" ON "TopCounterparty"("companyId", "counterpartyJar", "role");

-- AddForeignKey
ALTER TABLE "SodraHistory" ADD CONSTRAINT "SodraHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("jarKodas") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtRecord" ADD CONSTRAINT "CourtRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("jarKodas") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementYear" ADD CONSTRAINT "ProcurementYear_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("jarKodas") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopCounterparty" ADD CONSTRAINT "TopCounterparty_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("jarKodas") ON DELETE CASCADE ON UPDATE CASCADE;
