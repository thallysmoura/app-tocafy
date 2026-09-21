-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Track_ownerId_idx" ON "Track"("ownerId");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: a conta atual (única existente até aqui) vira admin e assume a
-- dona de tudo que já foi importado antes de a biblioteca ser por usuário.
UPDATE "User" SET "isAdmin" = true WHERE "email" = 'thallysmouraof@gmail.com';

UPDATE "Track"
SET "ownerId" = (SELECT "id" FROM "User" WHERE "email" = 'thallysmouraof@gmail.com')
WHERE "ownerId" IS NULL;
