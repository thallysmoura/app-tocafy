-- AlterTable
ALTER TABLE "AccessLog" ADD COLUMN     "cpuArch" TEXT,
ADD COLUMN     "deviceModel" TEXT,
ADD COLUMN     "deviceVendor" TEXT,
ADD COLUMN     "engine" TEXT;
