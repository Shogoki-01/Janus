"use server";

// Server actions for the Developer Mode flow. Prisma + Supabase Storage backed.
// Auth is intentionally stubbed (no session check) until we wire Supabase Auth;
// the route shell is internal-only.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addDocumentsToCase,
  createCase,
  setDocumentClassification,
  updateCaseFees,
} from "@/lib/data/cases";
import { db } from "@/lib/db";
import { decide, type CriminalSeverity, type DecisionApplicantInput } from "@/lib/decide";
import { effectiveMaxDepositMonths } from "@/lib/jurisdictions";
import { defaultClassifier } from "@/lib/providers/classifier";
import { extractFromCaseDocuments } from "@/lib/providers/extractor";
import { decisionToScenarioOutcome, generateDossier } from "@/lib/providers/dossier";
import {
  buildStoragePath,
  ensureCaseDocsBucket,
  uploadCaseDocument,
} from "@/lib/supabase/server";
import { ApplicationStatus, Prisma } from "@prisma/client";

// HTML checkboxes only appear in FormData when checked. Coerce "on"/true to
// true; absence (or any other value) to false.
const checkboxBool = z.preprocess(
  (v) => v === "on" || v === "true" || v === true,
  z.boolean()
);

const NewCaseSchema = z.object({
  propertyAddressLine1: z.string().trim().min(1, "Address is required"),
  propertyAddressLine2: z.string().trim().optional().nullable(),
  propertyCity: z.string().trim().min(1, "City is required"),
  propertyState: z
    .string()
    .trim()
    .length(2, "Use the 2-letter state code")
    .transform((s) => s.toUpperCase()),
  jurisdiction: z.string().trim().min(2),
  // Form sends dollars; we store cents.
  rentDollars: z.coerce.number().int().positive("Rent must be positive"),
  bedrooms: z.coerce.number().int().min(0).max(10),
  primaryApplicantName: z.string().trim().min(1, "Applicant name is required"),
  // Optional at intake — operators often don't have the email until they open
  // the AppFolio packet. If blank, we substitute a placeholder so the DB stays
  // happy; the operator can correct it later from the case detail page.
  primaryApplicantEmail: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Leave blank or enter a valid email",
    })
    .optional()
    .default(""),
  isSection8: checkboxBool,
  feeInternetCable: checkboxBool,
  feeResidentBenefits: checkboxBool,
  feeAdminOneTime: checkboxBool,
});

export async function createCaseAction(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const parsed = NewCaseSchema.parse({
    ...raw,
    // empty addressLine2 string → null
    propertyAddressLine2:
      typeof raw.propertyAddressLine2 === "string" && raw.propertyAddressLine2.trim() !== ""
        ? raw.propertyAddressLine2
        : null,
  });

  // Placeholder when the operator leaves email blank. Slugified name keeps it
  // recognizable in the DB and queryable; "pending.janus.local" TLD makes it
  // obviously a placeholder (not a real send-to address).
  const emailFallback = parsed.primaryApplicantEmail && parsed.primaryApplicantEmail !== ""
    ? parsed.primaryApplicantEmail
    : `${parsed.primaryApplicantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "applicant"}-${Math.random().toString(36).slice(2, 8)}@pending.janus.local`;

  const created = await createCase({
    propertyAddressLine1: parsed.propertyAddressLine1,
    propertyAddressLine2: parsed.propertyAddressLine2 ?? null,
    propertyCity: parsed.propertyCity,
    propertyState: parsed.propertyState,
    jurisdiction: parsed.jurisdiction,
    rentCents: parsed.rentDollars * 100,
    bedrooms: parsed.bedrooms,
    primaryApplicantName: parsed.primaryApplicantName,
    primaryApplicantEmail: emailFallback,
    isSection8: parsed.isSection8,
    feeInternetCable: parsed.feeInternetCable,
    feeResidentBenefits: parsed.feeResidentBenefits,
    feeAdminOneTime: parsed.feeAdminOneTime,
  });

  revalidatePath("/developer");
  redirect(`/developer/${created.id}`);
}

// ────────────────────────── Edit lease fees ──────────────────────────
//
// Lets the operator flip the per-case fee toggles after intake without
// recreating the case (and losing its uploaded docs). Used by the inline
// "Lease fees" panel on the case detail page.

export async function updateCaseFeesAction(
  caseId: string,
  formData: FormData
): Promise<void> {
  const parsed = z
    .object({
      feeInternetCable: checkboxBool,
      feeResidentBenefits: checkboxBool,
      feeAdminOneTime: checkboxBool,
    })
    .parse({
      feeInternetCable: formData.get("feeInternetCable"),
      feeResidentBenefits: formData.get("feeResidentBenefits"),
      feeAdminOneTime: formData.get("feeAdminOneTime"),
    });

  const updated = await updateCaseFees(caseId, parsed);
  if (!updated) throw new Error(`Case ${caseId} not found`);

  revalidatePath("/developer");
  revalidatePath(`/developer/${caseId}`);
  revalidatePath(`/developer/${caseId}/dossier`);
}

// ────────────────────────── Upload documents ──────────────────────────
//
// Multi-file upload. Bytes are written to Supabase Storage (bucket
// `case-documents`) via the service-role client, then a Document row is
// inserted per file with the resulting storage path. After persistence we
// inline-classify with the heuristic provider; real Claude/Textract impls
// will be a background job kicked off here behind the same seam.

const MAX_FILES_PER_UPLOAD = 25;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
// Operator packets are PDFs (AppFolio export, screening report, bank
// statements). Phone-pic IDs justify images. Anything else → reject.
const ALLOWED_MIME_PREFIXES = ["application/pdf", "image/"];

export async function uploadDocumentsAction(formData: FormData): Promise<void> {
  const caseId = z
    .string()
    .trim()
    .min(1, "Missing caseId")
    .parse(formData.get("caseId"));

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) throw new Error("Attach at least one file.");
  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new Error(`Too many files (max ${MAX_FILES_PER_UPLOAD} per upload).`);
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      throw new Error(`"${f.name}" exceeds the 20MB per-file limit.`);
    }
    const type = f.type || "";
    if (!ALLOWED_MIME_PREFIXES.some((p) => type.startsWith(p))) {
      throw new Error(`"${f.name}" has an unsupported type (${type || "unknown"}).`);
    }
  }

  // Storage first, then DB. If storage upload fails we never insert a row
  // (no orphan DB rows). If storage succeeds but DB insert later fails, we
  // accept the orphan blob — Storage GC can be scripted later.
  await ensureCaseDocsBucket();
  const uploads = await Promise.all(
    files.map(async (f) => {
      const storagePath = buildStoragePath(caseId, f.name);
      await uploadCaseDocument(storagePath, f);
      return {
        filename: f.name,
        sizeBytes: f.size,
        mimeType: f.type || "application/octet-stream",
        storagePath,
      };
    })
  );

  const { documents } = await addDocumentsToCase(caseId, uploads);

  // Inline classify. Heuristic is synchronous + cheap.
  await Promise.all(
    documents.map(async (d) => {
      const result = await defaultClassifier.classify({
        filename: d.filename,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
      });
      await setDocumentClassification(d.id, result.classification, result.confidence);
    })
  );

  revalidatePath("/developer");
  revalidatePath(`/developer/${caseId}`);
  redirect(`/developer/${caseId}`);
}

// ────────────────────────── Generate recommendation ──────────────────────────
//
// Reads all docs from Storage via signed URLs → Claude extracts per-applicant
// facts → applicant rows updated → decide() runs → second Claude call writes
// Slack + email blocks → everything persists in Application.analysisResult
// and the case transitions to DECISIONED.

export async function generateRecommendationAction(caseId: string): Promise<void> {
  const app = await db.application.findUnique({
    where: { id: caseId },
    include: {
      property: true,
      applicants: { include: { documents: true } },
    },
  });
  if (!app) throw new Error(`Case ${caseId} not found`);
  if (!app.property) throw new Error("Case has no property");
  if (!app.primaryApplicantId) throw new Error("Case has no primary applicant");

  const primary = app.applicants.find((a) => a.id === app.primaryApplicantId);
  if (!primary) throw new Error("Primary applicant row missing");

  const allDocs = app.applicants.flatMap((a) => a.documents);
  if (allDocs.length === 0) {
    throw new Error("Upload documents before generating a recommendation");
  }

  // Extractor handles download + text extraction (PDFs) or signed URL (images)
  // internally — we just pass through what's on the Document row.
  const docInputs = allDocs.map((d) => ({
    id: d.id,
    filename: d.filename ?? "(unknown)",
    classification: d.type,
    mimeType: d.mimeType ?? "application/octet-stream",
    storagePath: d.storagePath,
  }));

  // Voucher info is denormalized JSON; pull tenant portion if present.
  const voucherInfo = app.voucherInfo as { tenantPortionCents?: number } | null;
  const tenantPortionCents = voucherInfo?.tenantPortionCents ?? null;

  const extraction = await extractFromCaseDocuments({
    caseId: app.id,
    applicants: app.applicants.map((a) => ({
      id: a.id,
      fullName: a.fullName ?? a.email,
      email: a.email,
    })),
    property: {
      addressLine1: app.property.addressLine1,
      propertyAddressLine2: app.property.addressLine2,
      city: app.property.city,
      state: app.property.state,
      rentCents: app.property.rentCents,
      bedrooms: app.property.bedrooms,
      isSection8: app.isSection8,
      voucherTenantPortionCents: tenantPortionCents,
    },
    documents: docInputs,
  });

  // Persist extracted facts onto Applicant rows so future decide() calls work
  // straight off the DB. UPDATE per applicant.
  for (const e of extraction.applicants) {
    await db.applicant.update({
      where: { id: e.applicantId },
      data: {
        verifiedMonthlyIncomeCents: e.monthlyIncomeCents,
        creditScore: e.creditScore,
        hasCriminalFlags: e.criminalSeverity === "UNKNOWN" ? null : (e.criminalSeverity as CriminalSeverity),
        hasEvictionFlags: e.evictionFlag,
        bankruptcies: e.bankruptcies,
      },
    });
  }

  // Run the decision engine on the extracted facts.
  const decisionApplicants: DecisionApplicantInput[] = app.applicants.map((a) => {
    const e = extraction.applicants.find((x) => x.applicantId === a.id);
    return {
      id: a.id,
      verifiedMonthlyIncomeCents: e?.monthlyIncomeCents ?? null,
      creditScore: e?.creditScore ?? null,
      hasCriminalFlags: e?.criminalSeverity === "UNKNOWN" ? null : (e?.criminalSeverity ?? null),
      hasEvictionFlags: e?.evictionFlag ?? null,
    };
  });

  const decision = decide({
    rentCents: app.property.rentCents,
    isSection8: app.isSection8,
    voucherTenantPortionCents: tenantPortionCents,
    applicants: decisionApplicants,
    config: {
      minCreditScore: 600,
      incomeMultiplier: 3,
      maxDepositMonths: effectiveMaxDepositMonths(app.property.jurisdiction),
    },
    // For Developer Mode we trust the operator's upload as "complete". When
    // the SaaS flow unparks, this comes from per-applicant payment + verification state.
    allApplicantsComplete: true,
  });

  // Generate the four-scenario dossier (deny / approve / approve-2x / approve-3x).
  const primaryExtraction = extraction.applicants.find((e) => e.applicantId === primary.id);
  const recommendedOutcome = decisionToScenarioOutcome(decision.result);
  const dossier = await generateDossier({
    applicantName: primary.fullName ?? primary.email,
    applicantEmail: primary.email,
    propertyAddress: [
      app.property.addressLine1,
      app.property.addressLine2,
      `${app.property.city}, ${app.property.state}`,
    ]
      .filter(Boolean)
      .join(", "),
    rentCents: app.property.rentCents,
    bedrooms: app.property.bedrooms,
    isSection8: app.isSection8,
    voucherTenantPortionCents: tenantPortionCents,
    fees: {
      feeInternetCable: app.feeInternetCable,
      feeResidentBenefits: app.feeResidentBenefits,
      feeAdminOneTime: app.feeAdminOneTime,
    },
    monthlyIncomeCents: primaryExtraction?.monthlyIncomeCents ?? null,
    incomeConfidence: primaryExtraction?.incomeConfidence ?? 0,
    incomeSource: primaryExtraction?.incomeSource ?? null,
    creditScore: primaryExtraction?.creditScore ?? null,
    creditConfidence: primaryExtraction?.creditConfidence ?? 0,
    criminalSeverity: primaryExtraction?.criminalSeverity ?? "UNKNOWN",
    evictionFlag: primaryExtraction?.evictionFlag ?? null,
    bankruptcies: primaryExtraction?.bankruptcies ?? null,
    evidenceNotes: primaryExtraction?.evidenceNotes ?? "",
    crossDocNotes: extraction.crossDocNotes,
    decision,
    recommendedOutcome,
  });

  // Persist the whole analysis bundle + flip the case status.
  // Map StackedDecision → ApplicationStatus: APPROVED / CONDITIONAL / DENIED →
  // DECISIONED; MANUAL_REVIEW → IN_REVIEW (operator still has work to do).
  const nextStatus =
    decision.result === "MANUAL_REVIEW"
      ? ApplicationStatus.IN_REVIEW
      : ApplicationStatus.DECISIONED;

  await db.application.update({
    where: { id: app.id },
    data: {
      status: nextStatus,
      stackedDecision: decision.result,
      decisionReason: decision.reason,
      decisionedAt: decision.result === "MANUAL_REVIEW" ? null : new Date(),
      analysisResult: {
        applicants: extraction.applicants,
        documents: extraction.documents,
        crossDocNotes: extraction.crossDocNotes,
        decision,
        recommendedOutcome,
        dossier,
        generatedAt: new Date().toISOString(),
        model: "claude-sonnet-4-6",
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/developer");
  revalidatePath(`/developer/${caseId}`);
  revalidatePath(`/developer/${caseId}/dossier`);
  redirect(`/developer/${caseId}/dossier`);
}
