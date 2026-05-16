-- CreateTable
CREATE TABLE "predikts_users" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "pUsdBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predikts_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predikts_deposits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "amountUsdc" DECIMAL(18,6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predikts_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predikts_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "polyOrderId" TEXT,
    "tokenId" TEXT NOT NULL,
    "marketQuestion" TEXT,
    "side" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "orderType" TEXT NOT NULL DEFAULT 'MARKET',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predikts_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "predikts_users_walletAddress_key" ON "predikts_users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "predikts_deposits_txHash_key" ON "predikts_deposits"("txHash");

-- AddForeignKey
ALTER TABLE "predikts_deposits" ADD CONSTRAINT "predikts_deposits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "predikts_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predikts_orders" ADD CONSTRAINT "predikts_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "predikts_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
