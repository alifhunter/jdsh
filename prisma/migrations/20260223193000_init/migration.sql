-- CreateTable
CREATE TABLE "HoldingEntry" (
    "id" TEXT NOT NULL,
    "usernameDisplay" TEXT NOT NULL,
    "usernameKey" TEXT NOT NULL,
    "lots" INTEGER NOT NULL,
    "avgPrice" DECIMAL(20,2) NOT NULL,
    "totalNominal" DECIMAL(20,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HoldingEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HoldingEntry_lots_check" CHECK ("lots" >= 1 AND "lots" <= 10000000),
    CONSTRAINT "HoldingEntry_avgPrice_check" CHECK ("avgPrice" >= 0 AND "avgPrice" <= 9999999999999.99),
    CONSTRAINT "HoldingEntry_totalNominal_check" CHECK ("totalNominal" >= 0 AND "totalNominal" <= 9999999999999.99)
);

-- CreateIndex
CREATE UNIQUE INDEX "HoldingEntry_usernameKey_key" ON "HoldingEntry"("usernameKey");

-- CreateIndex
CREATE INDEX "HoldingEntry_rank_idx" ON "HoldingEntry"("lots" DESC, "totalNominal" DESC, "usernameKey" ASC);
