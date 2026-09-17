-- AlterTable
ALTER TABLE "Track" ADD COLUMN "r2Key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Track_r2Key_key" ON "Track"("r2Key");
