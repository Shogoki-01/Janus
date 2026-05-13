// Developer Mode data layer — Prisma-backed.
//
// Maps the existing SaaS Prisma model (Application + Property + Applicant +
// Document) onto Developer Mode's denormalized `CaseFixture` shape. UI
// consumers (developer pages + actions) keep their existing imports unchanged.
//
// Auth note: until Supabase Auth lands, every Developer Mode operation runs
// against a single hardcoded organization (DEFAULT_ORG_ID). Replace that with
// the session-resolved org once Supabase Auth is wired.

import { ApplicantRole, ApplicationStatus, DocumentType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// ─── Public types (denormalized read shape) ─────────────────────────────────

export type CaseStatus =
  | "INTAKE" // case created, no documents uploaded yet
  | "EXTRACTING" // docs uploaded; classification / OCR / fact extraction in flight
  | "READY_FOR_REVIEW" // extraction complete, operator must confirm facts
  | "DECISIONED"; // dossier generated

export type CaseFixture = {
  id: string;
  propertyAddressLine1: string;
  propertyAddressLine2: string | null;
  propertyCity: string;
  propertyState: string;
  jurisdiction: string;
  rentCents: number;
  bedrooms: number;
  primaryApplicantName: string;
  primaryApplicantEmail: string;
  isSection8: boolean;
  /** Optional lease fees (per case). Amounts live in lib/fees.ts. */
  feeInternetCable: boolean;
  feeResidentBenefits: boolean;
  feeAdminOneTime: boolean;
  status: CaseStatus;
  documentCount: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

// Re-export of Prisma's DocumentType so callers don't import from @prisma/client
// directly. Mapping from old Developer Mode names → Prisma enum:
//   GOVERNMENT_ID → ID, SCREENING_REPORT → SMARTMOVE_REPORT, VOUCHER → SECTION8_VOUCHER.
export type DocumentClassification = DocumentType;

export type DocumentFixture = {
  id: string;
  caseId: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  classification: DocumentClassification | null;
  classifierConfidence: number | null;
  storagePath: string;
  uploadedAt: string; // ISO
};

export function labelForDocumentType(t: DocumentType | null | undefined): string {
  switch (t) {
    case "APPFOLIO_APPLICATION": return "AppFolio application";
    case "SMARTMOVE_REPORT": return "Screening report";
    case "BANK_STATEMENT": return "Bank statement";
    case "PAYSTUB": return "Paystub";
    case "ID": return "Government ID";
    case "SECTION8_VOUCHER": return "Section 8 voucher";
    case "OTHER": return "Other";
    case "UNKNOWN": return "Unknown";
    default: return "Pending";
  }
}

// ─── Internal mappers ───────────────────────────────────────────────────────

// TODO: replace with the authenticated user's org once Supabase Auth lands.
const DEFAULT_ORG_ID = "seed-org-1";

// Prisma queries: a typed select that yields enough to project CaseFixture.
const caseInclude = {
  property: true,
  primaryApplicant: {
    include: { _count: { select: { documents: true } } },
  },
} satisfies Prisma.ApplicationInclude;

type CaseRow = Prisma.ApplicationGetPayload<{ include: typeof caseInclude }>;

function deriveCaseStatus(row: CaseRow): CaseStatus {
  const docCount = row.primaryApplicant?._count.documents ?? 0;
  switch (row.status) {
    case "DECISIONED":
      return "DECISIONED";
    case "IN_REVIEW":
    case "AWAITING_SCREENING_REPORT":
      return "READY_FOR_REVIEW";
    case "DRAFT":
    case "PAID":
    case "WITHDRAWN":
    default:
      return docCount > 0 ? "EXTRACTING" : "INTAKE";
  }
}

function projectCase(row: CaseRow): CaseFixture | null {
  if (!row.property || !row.primaryApplicant) return null;
  const voucher = (row.voucherInfo as Prisma.JsonObject | null) ?? null;
  return {
    id: row.id,
    propertyAddressLine1: row.property.addressLine1,
    propertyAddressLine2: row.property.addressLine2,
    propertyCity: row.property.city,
    propertyState: row.property.state,
    jurisdiction: row.property.jurisdiction,
    rentCents: row.property.rentCents,
    bedrooms: row.property.bedrooms,
    primaryApplicantName:
      row.primaryApplicant.fullName ?? row.primaryApplicant.email,
    primaryApplicantEmail: row.primaryApplicant.email,
    isSection8: row.isSection8,
    feeInternetCable: row.feeInternetCable,
    feeResidentBenefits: row.feeResidentBenefits,
    feeAdminOneTime: row.feeAdminOneTime,
    status: deriveCaseStatus(row),
    documentCount: row.primaryApplicant._count.documents,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function listCases(): Promise<CaseFixture[]> {
  const rows = await db.application.findMany({
    where: { property: { organizationId: DEFAULT_ORG_ID } },
    include: caseInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(projectCase).filter((c): c is CaseFixture => c !== null);
}

export async function getCaseById(id: string): Promise<CaseFixture | null> {
  const row = await db.application.findFirst({
    where: { id, property: { organizationId: DEFAULT_ORG_ID } },
    include: caseInclude,
  });
  return row ? projectCase(row) : null;
}

export type CreateCaseInput = {
  propertyAddressLine1: string;
  propertyAddressLine2: string | null;
  propertyCity: string;
  propertyState: string;
  jurisdiction: string;
  rentCents: number;
  bedrooms: number;
  primaryApplicantName: string;
  primaryApplicantEmail: string;
  isSection8: boolean;
  feeInternetCable: boolean;
  feeResidentBenefits: boolean;
  feeAdminOneTime: boolean;
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createCase(input: CreateCaseInput): Promise<CaseFixture> {
  // Every "New case" creates its own Property + Application + Applicant. We
  // don't dedupe properties yet — that's a separate flow once we have a real
  // catalog UI.
  const slugBase = slugify(input.propertyAddressLine1).slice(0, 32) || "case";
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;

  const result = await db.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        slug,
        addressLine1: input.propertyAddressLine1,
        addressLine2: input.propertyAddressLine2,
        city: input.propertyCity,
        state: input.propertyState,
        postalCode: "", // Developer Mode form doesn't collect ZIP yet
        jurisdiction: input.jurisdiction,
        rentCents: input.rentCents,
        // Deposit defaults to 1× rent in dev; jurisdiction-aware cap handled
        // by lib/jurisdictions.ts at decision time.
        depositCents: input.rentCents,
        bedrooms: input.bedrooms,
      },
    });
    const app = await tx.application.create({
      data: {
        propertyId: property.id,
        status: ApplicationStatus.DRAFT,
        isSection8: input.isSection8,
        feeInternetCable: input.feeInternetCable,
        feeResidentBenefits: input.feeResidentBenefits,
        feeAdminOneTime: input.feeAdminOneTime,
      },
    });
    const applicant = await tx.applicant.create({
      data: {
        applicationId: app.id,
        role: ApplicantRole.PRIMARY,
        fullName: input.primaryApplicantName,
        email: input.primaryApplicantEmail,
      },
    });
    return tx.application.update({
      where: { id: app.id },
      data: { primaryApplicantId: applicant.id },
      include: caseInclude,
    });
  });
  const projected = projectCase(result);
  if (!projected) throw new Error("Failed to project newly-created case");
  return projected;
}

// ─── Documents ──────────────────────────────────────────────────────────────

export async function listDocumentsByCaseId(
  caseId: string
): Promise<DocumentFixture[]> {
  const docs = await db.document.findMany({
    where: { applicant: { primaryOf: { id: caseId } } },
    orderBy: { uploadedAt: "asc" },
  });
  return docs.map(projectDocument);
}

function projectDocument(d: {
  id: string;
  applicantId: string;
  type: DocumentType | null;
  classifierConfidence: number | null;
  filename: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  storagePath: string;
  uploadedAt: Date;
}): DocumentFixture {
  return {
    id: d.id,
    caseId: d.applicantId, // Note: caseId is really applicationId at the API layer;
    // we keep this projection alias because the data layer treats the Document
    // as living on the case (applicant.primaryOf.id is the actual case id when
    // we need it; callers don't usually need it).
    filename: d.filename ?? "(unknown)",
    sizeBytes: d.sizeBytes ?? 0,
    mimeType: d.mimeType ?? "application/octet-stream",
    classification: d.type,
    classifierConfidence: d.classifierConfidence,
    storagePath: d.storagePath,
    uploadedAt: d.uploadedAt.toISOString(),
  };
}

export type NewDocumentInput = {
  filename: string;
  sizeBytes: number;
  mimeType: string;
  /** Required — the Storage path the bytes were written to. */
  storagePath: string;
};

/**
 * Appends documents to a case and transitions DRAFT → still DRAFT (Developer
 * Mode's EXTRACTING state is derived from `status=DRAFT AND docCount > 0`).
 * Bumps updatedAt. Throws if the case or its primary applicant doesn't exist.
 */
export async function addDocumentsToCase(
  caseId: string,
  inputs: NewDocumentInput[]
): Promise<{ caseFixture: CaseFixture; documents: DocumentFixture[] }> {
  const result = await db.$transaction(async (tx) => {
    const app = await tx.application.findFirst({
      where: { id: caseId, property: { organizationId: DEFAULT_ORG_ID } },
      include: caseInclude,
    });
    if (!app) throw new Error(`Case ${caseId} not found`);
    if (!app.primaryApplicantId) {
      throw new Error(`Case ${caseId} has no primary applicant — cannot attach documents`);
    }
    const docs = await Promise.all(
      inputs.map((input) =>
        tx.document.create({
          data: {
            applicantId: app.primaryApplicantId!,
            type: null,
            filename: input.filename,
            sizeBytes: input.sizeBytes,
            mimeType: input.mimeType,
            storagePath: input.storagePath,
          },
        })
      )
    );
    // Touch updatedAt explicitly — Prisma's @updatedAt only fires on column changes.
    const refreshed = await tx.application.update({
      where: { id: app.id },
      data: { updatedAt: new Date() },
      include: caseInclude,
    });
    return { app: refreshed, docs };
  });
  const projected = projectCase(result.app);
  if (!projected) throw new Error("Failed to project case after upload");
  return {
    caseFixture: projected,
    documents: result.docs.map(projectDocument),
  };
}

/**
 * Updates the lease fee flags on a case. Returns the refreshed projection so
 * callers can re-render the detail page without an extra read.
 */
export async function updateCaseFees(
  caseId: string,
  flags: {
    feeInternetCable: boolean;
    feeResidentBenefits: boolean;
    feeAdminOneTime: boolean;
  }
): Promise<CaseFixture | null> {
  const updated = await db.application.update({
    where: { id: caseId },
    data: flags,
    include: caseInclude,
  });
  return projectCase(updated);
}

/**
 * Writes a classification result into a Document row. No-op if the document
 * doesn't exist (we don't want classifier callbacks to fail loudly).
 */
export async function setDocumentClassification(
  documentId: string,
  classification: DocumentClassification,
  confidence: number
): Promise<void> {
  await db.document
    .update({
      where: { id: documentId },
      data: {
        type: classification,
        classifierConfidence: confidence,
      },
    })
    .catch(() => undefined);
}
