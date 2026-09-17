-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "country" TEXT,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "userAgent" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "deviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessLog_userId_createdAt_idx" ON "AccessLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
