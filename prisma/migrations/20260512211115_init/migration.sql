-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'REVIEWER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'PAID', 'AWAITING_SCREENING_REPORT', 'IN_REVIEW', 'DECISIONED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StackedDecision" AS ENUM ('APPROVED', 'CONDITIONAL_DOUBLE_DEPOSIT', 'DENIED', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "ApplicantRole" AS ENUM ('PRIMARY', 'CO_APPLICANT');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'STARTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "IndividualDecision" AS ENUM ('PASS', 'FAIL', 'DOUBLE_DEPOSIT_FLAG');

-- CreateEnum
CREATE TYPE "ScreeningStatus" AS ENUM ('NOT_STARTED', 'INVITED', 'REPORT_RECEIVED', 'ERROR');

-- CreateEnum
CREATE TYPE "CriminalSeverity" AS ENUM ('NONE', 'MINOR', 'MAJOR');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('EMPLOYMENT', 'LANDLORD');

-- CreateEnum
CREATE TYPE "ReferenceStatus" AS ENUM ('REQUESTED', 'RESPONDED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BANK_STATEMENT', 'PAYSTUB', 'ID', 'SECTION8_VOUCHER', 'SMARTMOVE_REPORT', 'APPFOLIO_APPLICATION', 'UNKNOWN', 'OTHER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "rentCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "minCreditScore" INTEGER NOT NULL DEFAULT 600,
    "incomeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "maxDepositMonths" INTEGER NOT NULL DEFAULT 2,
    "occupancyCap" INTEGER NOT NULL DEFAULT 2,
    "platformFeeCents" INTEGER NOT NULL DEFAULT 3000,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 730,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "primaryApplicantId" TEXT,
    "totalMonthlyIncomeCents" INTEGER,
    "stackedDecision" "StackedDecision",
    "decisionReason" TEXT,
    "decisionedAt" TIMESTAMP(3),
    "isSection8" BOOLEAN NOT NULL DEFAULT false,
    "voucherInfo" JSONB,
    "platformFeePaidAt" TIMESTAMP(3),
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "role" "ApplicantRole" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "ssnEncrypted" TEXT,
    "dob" TIMESTAMP(3),
    "currentAddress" TEXT,
    "inviteToken" TEXT,
    "inviteStatus" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "screeningStatus" "ScreeningStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "smartmoveInviteSentAt" TIMESTAMP(3),
    "smartmoveReportReceivedAt" TIMESTAMP(3),
    "hasCriminalFlags" "CriminalSeverity",
    "hasEvictionFlags" BOOLEAN,
    "creditScore" INTEGER,
    "bankruptcies" INTEGER,
    "verifiedMonthlyIncomeCents" INTEGER,
    "individualDecision" "IndividualDecision",
    "platformFeePaidAt" TIMESTAMP(3),
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "type" "ReferenceType" NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "verificationToken" TEXT NOT NULL,
    "status" "ReferenceStatus" NOT NULL DEFAULT 'REQUESTED',
    "responseData" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "type" "DocumentType",
    "classifierConfidence" DOUBLE PRECISION,
    "filename" TEXT,
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "storagePath" TEXT NOT NULL,
    "ocrResult" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningReport" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "normalizedData" JSONB NOT NULL,
    "rawPdfDocumentId" TEXT,
    "ingestedByUserId" TEXT,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "event" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_organizationId_idx" ON "Property"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationConfig_organizationId_key" ON "ApplicationConfig"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_primaryApplicantId_key" ON "Application"("primaryApplicantId");

-- CreateIndex
CREATE INDEX "Application_propertyId_idx" ON "Application"("propertyId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_inviteToken_key" ON "Applicant"("inviteToken");

-- CreateIndex
CREATE INDEX "Applicant_applicationId_idx" ON "Applicant"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Reference_verificationToken_key" ON "Reference"("verificationToken");

-- CreateIndex
CREATE INDEX "Reference_applicantId_idx" ON "Reference"("applicantId");

-- CreateIndex
CREATE INDEX "Document_applicantId_idx" ON "Document"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningReport_rawPdfDocumentId_key" ON "ScreeningReport"("rawPdfDocumentId");

-- CreateIndex
CREATE INDEX "ScreeningReport_applicantId_idx" ON "ScreeningReport"("applicantId");

-- CreateIndex
CREATE INDEX "AuditLog_applicationId_idx" ON "AuditLog"("applicationId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationConfig" ADD CONSTRAINT "ApplicationConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_primaryApplicantId_fkey" FOREIGN KEY ("primaryApplicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningReport" ADD CONSTRAINT "ScreeningReport_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningReport" ADD CONSTRAINT "ScreeningReport_rawPdfDocumentId_fkey" FOREIGN KEY ("rawPdfDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningReport" ADD CONSTRAINT "ScreeningReport_ingestedByUserId_fkey" FOREIGN KEY ("ingestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
