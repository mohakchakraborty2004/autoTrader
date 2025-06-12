-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "xUsername" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "decision" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userWatch" (
    "id" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "Xusername" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_telegramId_key" ON "user"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "token_symbol_key" ON "token"("symbol");

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userWatch" ADD CONSTRAINT "userWatch_telegramUserId_fkey" FOREIGN KEY ("telegramUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userWatch" ADD CONSTRAINT "userWatch_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
