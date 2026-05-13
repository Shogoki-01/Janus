// Dev seed. Idempotent: re-running re-uses the existing Organization /
// ApplicationConfig / Property rows and only inserts new Applications +
// Applicants + Documents if they're missing. Safe to run repeatedly.
//
// Run: `npx prisma db seed` (loads .env via next-style; if you run from CLI,
// prefix with `set -a && source .env.local && set +a &&` first).

import { ApplicantRole, ApplicationStatus, DocumentType, Prisma, PrismaClient, Role } from "@prisma/client";

const db = new PrismaClient();

const ORG_NAME = "Customer of One PM Co.";
const OWNER_EMAIL = "didier.ortiz.2412@gmail.com";

async function main() {
  console.log("Seeding Janus dev database...");

  // ─── Organization + Owner + ApplicationConfig ────────────────────────────
  const org = await db.organization.upsert({
    where: { id: "seed-org-1" },
    update: { name: ORG_NAME },
    create: { id: "seed-org-1", name: ORG_NAME },
  });

  await db.user.upsert({
    where: { authId: "seed-auth-owner" },
    update: {},
    create: {
      authId: "seed-auth-owner",
      email: OWNER_EMAIL,
      organizationId: org.id,
      role: Role.OWNER,
    },
  });

  await db.applicationConfig.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      minCreditScore: 600,
      incomeMultiplier: 3.0,
      maxDepositMonths: 2,
      occupancyCap: 2,
      platformFeeCents: 3000,
      dataRetentionDays: 730,
    },
  });

  // ─── Properties ──────────────────────────────────────────────────────────
  const properties = await Promise.all(
    [
      {
        slug: "the-larkin-3b",
        addressLine1: "247 Larkin Street",
        addressLine2: "Unit 3B",
        city: "San Francisco",
        state: "CA",
        postalCode: "94102",
        jurisdiction: "US-CA-SF",
        rentCents: 325_000,
        depositCents: 325_000,
        bedrooms: 2,
      },
      {
        slug: "1208-polk",
        addressLine1: "1208 Polk Street",
        addressLine2: null,
        city: "San Francisco",
        state: "CA",
        postalCode: "94109",
        jurisdiction: "US-CA-SF",
        rentCents: 285_000,
        depositCents: 285_000,
        bedrooms: 1,
      },
      {
        slug: "412-hayes-2",
        addressLine1: "412 Hayes Street",
        addressLine2: "Apt 2",
        city: "San Francisco",
        state: "CA",
        postalCode: "94102",
        jurisdiction: "US-CA-SF",
        rentCents: 410_000,
        depositCents: 410_000,
        bedrooms: 2,
      },
    ].map((p) =>
      db.property.upsert({
        where: { slug: p.slug },
        update: {},
        create: { ...p, organizationId: org.id },
      })
    )
  );
  const [larkin, polk, hayes] = properties;

  // ─── Applications + primary Applicants + Documents ───────────────────────
  //
  // Three demo cases mirroring the prior fixtures so the UI doesn't go empty
  // after the swap. Each Application + Applicant is created in a transaction
  // so primaryApplicantId is wired atomically.

  await seedApplication({
    propertyId: larkin.id,
    status: ApplicationStatus.IN_REVIEW, // CaseStatus.READY_FOR_REVIEW
    isSection8: false,
    primary: {
      email: "maya.chen@example.com",
      fullName: "Maya Chen",
      verifiedMonthlyIncomeCents: 1_050_000,
      creditScore: 712,
      hasCriminalSeverity: "NONE",
      hasEvictionFlags: false,
    },
    documents: [
      ["maya_chen_appfolio_application.pdf", 612_400, "application/pdf", DocumentType.APPFOLIO_APPLICATION, 0.92],
      ["TU_smartmove_report_maya.pdf", 1_124_900, "application/pdf", DocumentType.SMARTMOVE_REPORT, 0.92],
      ["chase_statement_feb_2026.pdf", 488_200, "application/pdf", DocumentType.BANK_STATEMENT, 0.92],
      ["chase_statement_mar_2026.pdf", 491_800, "application/pdf", DocumentType.BANK_STATEMENT, 0.92],
      ["chase_statement_apr_2026.pdf", 502_300, "application/pdf", DocumentType.BANK_STATEMENT, 0.92],
      ["paystub_march.pdf", 188_700, "application/pdf", DocumentType.PAYSTUB, 0.92],
      ["drivers_license_ca.jpg", 2_104_800, "image/jpeg", DocumentType.ID, 0.92],
    ],
  });

  await seedApplication({
    propertyId: polk.id,
    status: ApplicationStatus.DRAFT, // CaseStatus.EXTRACTING (DRAFT + docCount > 0)
    isSection8: true,
    voucherTenantPortionCents: 60_000,
    primary: {
      email: "d.okafor@example.com",
      fullName: "Daniel Okafor",
    },
    documents: [
      ["okafor_application_packet.pdf", 740_100, "application/pdf", DocumentType.APPFOLIO_APPLICATION, 0.7],
      ["screening_report.pdf", 980_400, "application/pdf", DocumentType.SMARTMOVE_REPORT, 0.7],
      // Two pending classify — null type, null confidence
      ["section_8_voucher.pdf", 312_600, "application/pdf", null, null],
      ["state_id.jpg", 1_840_200, "image/jpeg", null, null],
    ],
  });

  await seedApplication({
    propertyId: hayes.id,
    status: ApplicationStatus.DRAFT, // CaseStatus.INTAKE (DRAFT + docCount = 0)
    isSection8: false,
    primary: {
      email: "rosa.i@example.com",
      fullName: "Rosa Iglesias",
    },
    documents: [],
  });

  console.log("✔ Seed complete");
}

type SeedAppInput = {
  propertyId: string;
  status: ApplicationStatus;
  isSection8: boolean;
  voucherTenantPortionCents?: number;
  primary: {
    email: string;
    fullName: string;
    verifiedMonthlyIncomeCents?: number;
    creditScore?: number;
    hasCriminalSeverity?: "NONE" | "MINOR" | "MAJOR";
    hasEvictionFlags?: boolean;
  };
  documents: Array<[
    filename: string,
    sizeBytes: number,
    mimeType: string,
    type: DocumentType | null,
    confidence: number | null,
  ]>;
};

async function seedApplication(input: SeedAppInput) {
  // Idempotent guard: if an application for this property+email already exists, skip.
  const existing = await db.applicant.findFirst({
    where: {
      email: input.primary.email,
      application: { propertyId: input.propertyId },
    },
    include: { application: { include: { applicants: { include: { documents: true } } } } },
  });
  if (existing) {
    console.log(`  · ${input.primary.fullName} (${input.primary.email}) — already seeded, skipping`);
    return;
  }

  await db.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        propertyId: input.propertyId,
        status: input.status,
        isSection8: input.isSection8,
        voucherInfo: input.voucherTenantPortionCents
          ? { tenantPortionCents: input.voucherTenantPortionCents }
          : Prisma.JsonNull,
      },
    });
    const applicant = await tx.applicant.create({
      data: {
        applicationId: app.id,
        role: ApplicantRole.PRIMARY,
        fullName: input.primary.fullName,
        email: input.primary.email,
        verifiedMonthlyIncomeCents: input.primary.verifiedMonthlyIncomeCents,
        creditScore: input.primary.creditScore,
        hasCriminalFlags: input.primary.hasCriminalSeverity ?? null,
        hasEvictionFlags: input.primary.hasEvictionFlags ?? null,
      },
    });
    await tx.application.update({
      where: { id: app.id },
      data: { primaryApplicantId: applicant.id },
    });
    for (const [filename, sizeBytes, mimeType, type, confidence] of input.documents) {
      await tx.document.create({
        data: {
          applicantId: applicant.id,
          type,
          classifierConfidence: confidence,
          filename,
          sizeBytes,
          mimeType,
          // Placeholder storage path for seed rows — no real file behind it.
          // Upload action writes the real path on actual uploads.
          storagePath: `seed://${input.primary.email}/${filename}`,
        },
      });
    }
  });
  console.log(`  ✔ Seeded ${input.primary.fullName} → property ${input.propertyId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
