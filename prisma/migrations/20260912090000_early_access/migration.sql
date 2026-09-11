-- CreateTable
CREATE TABLE "EarlyAccessRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "clientCount" TEXT NOT NULL,
    "message" TEXT,
    "locale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarlyAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EarlyAccessRequest_email_key" ON "EarlyAccessRequest"("email");

-- CreateIndex
CREATE INDEX "EarlyAccessRequest_createdAt_idx" ON "EarlyAccessRequest"("createdAt");
