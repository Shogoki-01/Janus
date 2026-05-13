-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "feeAdminOneTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feeInternetCable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feeResidentBenefits" BOOLEAN NOT NULL DEFAULT false;
