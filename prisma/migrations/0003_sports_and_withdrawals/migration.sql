-- CreateTable sports_users
CREATE TABLE "sports_users" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "usdtBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sports_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sports_users_walletAddress_key" ON "sports_users"("walletAddress");

-- CreateTable sports_bets
CREATE TABLE "sports_bets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "outcomeId" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "potentialPayout" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "azuroBetId" TEXT,
    "marketName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sports_bets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sports_bets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "sports_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable sports_deposits
CREATE TABLE "sports_deposits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "amountUsdt" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sports_deposits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sports_deposits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "sports_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "sports_deposits_txHash_key" ON "sports_deposits"("txHash");

-- CreateTable withdrawals
CREATE TABLE "withdrawals" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amountUsd" DECIMAL(18,6) NOT NULL,
    "token" TEXT NOT NULL,
    "txHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "withdrawals_txHash_key" ON "withdrawals"("txHash");
