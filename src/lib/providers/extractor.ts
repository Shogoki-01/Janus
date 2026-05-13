// Document fact extractor — Claude reads the uploaded PDFs/images and pulls
// out the per-applicant facts the decision engine needs.
//
// Architecture: one Claude call **per document**, fanned out in parallel
// (`Promise.all`). Each call returns the full `ExtractedApplicant` shape with
// fields set only for what THIS document told us — null/empty for everything
// else. A pure-code aggregator then merges the per-doc results using
// classification-aware priority (bank statements > paystubs > app for income,
// screening report-only for credit/criminal/eviction, app-only for
// demographics).
//
// Why parallel instead of one big call:
//   - Wall-clock: 7 sequential PDFs at ~5–10s each → ~50s; 7 in parallel → ~10s
//   - The system prompt is identical across the fan-out and gets prompt-cached
//     after the first call, so token cost is roughly flat
//   - Per-call output is smaller (one doc → mostly nulls), so output tokens
//     drop too
//
// Server-only.

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { DocumentType } from "@prisma/client";
import { labelForDocumentType } from "@/lib/data/cases";
import { extractPdfText } from "@/lib/pdf";
import { downloadCaseDocument, getSignedUrl } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-6";

const client = new Anthropic();

// ─── Output shape ──────────────────────────────────────────────────────────

export type ExtractedApplicant = {
  applicantId: string;
  fullName: string;
  /** null when no documents support an income figure */
  monthlyIncomeCents: number | null;
  incomeConfidence: number; // 0..1
  incomeSource: string | null; // "bank statements" / "paystub" / "stated on application"
  creditScore: number | null;
  creditConfidence: number;
  /** UNKNOWN when no screening report is present */
  criminalSeverity: "NONE" | "MINOR" | "MAJOR" | "UNKNOWN";
  evictionFlag: boolean | null;
  bankruptcies: number | null;
  evidenceNotes: string;

  // ─── Application demographics (mostly from the AppFolio packet) ───
  householdSummary: string;
  householdSize: number | null;
  infantCount: number | null;
  petsSummary: string;
  vehiclesSummary: string;
  employerName: string | null;
  employmentRole: string | null;
  employmentTenureSummary: string;
  priorResidenceSummary: string;
};

export type ExtractionResult = {
  applicants: ExtractedApplicant[];
  /** Heuristic cross-doc notes (e.g. name mismatch between ID and application). */
  crossDocNotes: string;
};

// ─── Inputs ────────────────────────────────────────────────────────────────

export type ExtractionApplicantInput = {
  id: string;
  fullName: string;
  email: string;
};

export type ExtractionDocumentInput = {
  id: string;
  filename: string;
  classification: DocumentType | null;
  /** Storage path on the case-documents bucket. Extractor handles download + URL signing. */
  storagePath: string;
  mimeType: string;
};

export type ExtractionInput = {
  caseId: string;
  applicants: ExtractionApplicantInput[];
  property: {
    addressLine1: string;
    propertyAddressLine2: string | null;
    city: string;
    state: string;
    rentCents: number;
    bedrooms: number;
    isSection8: boolean;
    voucherTenantPortionCents: number | null;
  };
  documents: ExtractionDocumentInput[];
};

// ─── Per-doc system prompt (cacheable across the parallel fan-out) ────────

const PER_DOC_SYSTEM = `You are an experienced tenant-screening analyst. You are reviewing **ONE document** from a rental application case. Other documents will be reviewed independently by parallel passes; you don't see them. Your output will be merged in code afterward.

**Your job for THIS document:**
For each applicant listed, return the full per-applicant facts schema. **Populate only what THIS document tells you.** For fields this document doesn't touch, return null (for nullable fields) or "" (for string fields). Don't guess. Don't carry over assumptions from other doc types.

**Source-of-truth guidance (decide based on the document classification you'll see in the user message):**
- Screening report (TransUnion / SmartMove): credit score, criminal severity, eviction flag, bankruptcies. Leave income + demographics empty.
- Bank statement: monthly income (average payroll deposits across the statement period — multiply weekly × 4.33 / bi-weekly × 2.17 if it's a weekly stub; for a full statement just average deposit totals over the months covered). Leave credit / criminal / eviction / demographics empty.
- Paystub: monthly income from gross-pay × pay-frequency multiplier. Also \`employerName\` and \`employmentRole\` if shown. Leave demographics other than employment empty.
- AppFolio application packet: \`householdSummary\`, \`householdSize\`, \`infantCount\`, \`petsSummary\`, \`vehiclesSummary\`, \`employerName\`, \`employmentRole\`, \`employmentTenureSummary\`, \`priorResidenceSummary\`. May also state an income figure — use it but tag \`incomeSource: "stated on application"\` and lower confidence (≤ 0.5).
- Government ID: \`fullName\` only (verify against the applicant list). Leave everything else empty.
- Section 8 voucher: voucher tenant-portion details if shown in evidenceNotes; everything else empty.

**Field semantics:**
- \`monthlyIncomeCents\` — integer cents. Null if this doc doesn't mention income.
- \`incomeConfidence\` — 0..1. Bank statement avg ≈ 0.9; paystub × multiplier ≈ 0.8; app-stated ≈ 0.4.
- \`incomeSource\` — short label: "bank statements" / "paystub" / "stated on application". Null if no income figure.
- \`creditScore\` — 300–850. Null unless this is a screening report.
- \`creditConfidence\` — 0..1. Mirror incomeConfidence semantics.
- \`criminalSeverity\` — "UNKNOWN" unless this is a screening report. NONE / MINOR / MAJOR per HUD framing (NONE = clean; MINOR = misdemeanor non-violent only; MAJOR = felony, violent, or recent serious).
- \`evictionFlag\` — true / false / null. Null unless screening report.
- \`bankruptcies\` — integer / null. Null unless screening report.
- Demographic fields: empty string when this doc doesn't address them.

**\`evidenceNotes\`** — feeds the downstream dossier prompt. 1–3 short bullets (newline-separated, each starting with "• ") describing what THIS document shows. Synthesize, don't paste — no raw transaction lines, account numbers, or page headers. Use \$ and tabular numbers.

**Style for demographic summary fields** (render directly in scan-at-a-glance UI boxes):
- One short human-readable phrase, no bullets, no leading "•".
- Abbreviations OK (yrs / mos). "·" as separator between facts.
- Empty string when not stated. Never write "Not stated" / "N/A" / "Unknown".

Output strictly conforms to the provided JSON schema. No prose outside the JSON.`;

// Same shape as ExtractedApplicant, but the JSON schema lives here for the
// per-doc call. crossDocNotes is omitted since reconciliation happens after
// the merge in code.
const PER_DOC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["applicants"],
  properties: {
    applicants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "applicantId",
          "fullName",
          "monthlyIncomeCents",
          "incomeConfidence",
          "incomeSource",
          "creditScore",
          "creditConfidence",
          "criminalSeverity",
          "evictionFlag",
          "bankruptcies",
          "evidenceNotes",
          "householdSummary",
          "householdSize",
          "infantCount",
          "petsSummary",
          "vehiclesSummary",
          "employerName",
          "employmentRole",
          "employmentTenureSummary",
          "priorResidenceSummary",
        ],
        properties: {
          applicantId: { type: "string" },
          fullName: { type: "string" },
          monthlyIncomeCents: { type: ["integer", "null"] },
          incomeConfidence: { type: "number" },
          incomeSource: { type: ["string", "null"] },
          creditScore: { type: ["integer", "null"] },
          creditConfidence: { type: "number" },
          criminalSeverity: {
            type: "string",
            enum: ["NONE", "MINOR", "MAJOR", "UNKNOWN"],
          },
          evictionFlag: { type: ["boolean", "null"] },
          bankruptcies: { type: ["integer", "null"] },
          evidenceNotes: { type: "string" },
          householdSummary: { type: "string" },
          householdSize: { type: ["integer", "null"] },
          infantCount: { type: ["integer", "null"] },
          petsSummary: { type: "string" },
          vehiclesSummary: { type: "string" },
          employerName: { type: ["string", "null"] },
          employmentRole: { type: ["string", "null"] },
          employmentTenureSummary: { type: "string" },
          priorResidenceSummary: { type: "string" },
        },
      },
    },
  },
} as const;

// ─── Public entry — parallel orchestrator ──────────────────────────────────

export async function extractFromCaseDocuments(
  input: ExtractionInput
): Promise<ExtractionResult> {
  if (input.documents.length === 0) {
    throw new Error("No documents to extract from");
  }

  // Fan out: one Claude call per document, all in parallel. Each call uses
  // the same cached system prompt — only the user content differs.
  const perDocRaw = await Promise.all(
    input.documents.map((doc) => extractFromSingleDocument({ doc, input }))
  );

  // Merge in code. Skip docs that failed (returned null).
  const perDoc = perDocRaw.filter((d): d is PerDocResult => d !== null);
  return aggregateExtractions(perDoc, input);
}

// ─── Per-doc Claude call ───────────────────────────────────────────────────

type PerDocResult = {
  docId: string;
  classification: DocumentType | null;
  applicants: ExtractedApplicant[];
};

async function extractFromSingleDocument(args: {
  doc: ExtractionDocumentInput;
  input: ExtractionInput;
}): Promise<PerDocResult | null> {
  const { doc, input } = args;

  let docBlocks: Array<Record<string, unknown>>;
  try {
    docBlocks = await documentToContentBlocks(doc);
  } catch (err) {
    console.error(`Failed to prepare blocks for doc ${doc.id}:`, err);
    return null;
  }
  if (docBlocks.length === 0) return null;

  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: buildPerDocPrompt(doc, input) },
    ...docBlocks,
  ];

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      // Tight cap — per-doc output is small (one doc's contribution, mostly nulls).
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: PER_DOC_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent as never }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: {
        format: { type: "json_schema", schema: PER_DOC_SCHEMA },
      } as any,
    });
  } catch (err) {
    console.error(`Claude call failed for doc ${doc.id}:`, err);
    return null;
  }

  if (response.stop_reason === "refusal") {
    console.warn(`Claude refused on doc ${doc.id}`);
    return null;
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;

  try {
    const parsed = JSON.parse(textBlock.text) as { applicants: ExtractedApplicant[] };
    return {
      docId: doc.id,
      classification: doc.classification,
      applicants: parsed.applicants,
    };
  } catch (err) {
    console.error(`Per-doc JSON parse failed for ${doc.id}:`, err);
    return null;
  }
}

// ─── Code-side aggregator ──────────────────────────────────────────────────

function aggregateExtractions(
  perDoc: PerDocResult[],
  input: ExtractionInput
): ExtractionResult {
  const applicants: ExtractedApplicant[] = input.applicants.map((a) => {
    // Per-applicant slices across all per-doc results.
    const slices = perDoc
      .map((d) => ({
        classification: d.classification,
        facts: d.applicants.find((x) => x.applicantId === a.id),
      }))
      .filter((s): s is { classification: DocumentType | null; facts: ExtractedApplicant } => !!s.facts);

    // Income — priority: bank statement > paystub > app-stated. Confidence
    // inherits from the chosen source.
    const incomePick = pickByPriority(
      slices,
      ["BANK_STATEMENT", "PAYSTUB", "APPFOLIO_APPLICATION"],
      (f) => (f.monthlyIncomeCents != null ? { value: f.monthlyIncomeCents, confidence: f.incomeConfidence ?? 0 } : null)
    );

    // Credit / criminal / eviction / bankruptcies — only the screening report
    // is authoritative. If no screening report doc is present, leave as defaults.
    const screeningSlice = slices.find((s) => s.classification === "SMARTMOVE_REPORT")?.facts;

    // Demographics — only the AppFolio app supplies these in v1.
    const appSlice = slices.find((s) => s.classification === "APPFOLIO_APPLICATION")?.facts;

    // Employment fields — paystub wins on employerName / employmentRole; app wins on tenure.
    const paystubSlice = slices.find((s) => s.classification === "PAYSTUB")?.facts;

    // Evidence notes — concatenate all non-empty per-doc notes for this applicant.
    const evidenceNotes = slices
      .map((s) => s.facts.evidenceNotes?.trim())
      .filter((s): s is string => !!s && s.length > 0)
      .join("\n");

    return {
      applicantId: a.id,
      fullName: a.fullName,
      monthlyIncomeCents: incomePick?.value ?? null,
      incomeConfidence: incomePick?.confidence ?? 0,
      incomeSource: incomePick ? incomeSourceLabel(incomePick.classification) : null,
      creditScore: screeningSlice?.creditScore ?? null,
      creditConfidence: screeningSlice?.creditConfidence ?? 0,
      criminalSeverity: screeningSlice?.criminalSeverity ?? "UNKNOWN",
      evictionFlag: screeningSlice?.evictionFlag ?? null,
      bankruptcies: screeningSlice?.bankruptcies ?? null,
      evidenceNotes,
      householdSummary: appSlice?.householdSummary ?? "",
      householdSize: appSlice?.householdSize ?? null,
      infantCount: appSlice?.infantCount ?? null,
      petsSummary: appSlice?.petsSummary ?? "",
      vehiclesSummary: appSlice?.vehiclesSummary ?? "",
      employerName: paystubSlice?.employerName ?? appSlice?.employerName ?? null,
      employmentRole: paystubSlice?.employmentRole ?? appSlice?.employmentRole ?? null,
      employmentTenureSummary:
        appSlice?.employmentTenureSummary ||
        paystubSlice?.employmentTenureSummary ||
        "",
      priorResidenceSummary: appSlice?.priorResidenceSummary ?? "",
    };
  });

  // Heuristic cross-doc notes — name mismatches across docs that state a name.
  const crossDocNotes = computeCrossDocNotes(perDoc, input);

  return { applicants, crossDocNotes };
}

function pickByPriority(
  slices: Array<{ classification: DocumentType | null; facts: ExtractedApplicant }>,
  priority: DocumentType[],
  getter: (f: ExtractedApplicant) => { value: number; confidence: number } | null
): { value: number; confidence: number; classification: DocumentType | null } | null {
  for (const c of priority) {
    const match = slices.find((s) => s.classification === c);
    if (match) {
      const got = getter(match.facts);
      if (got) return { ...got, classification: c };
    }
  }
  // Fallback: any slice with a value, regardless of classification.
  for (const s of slices) {
    const got = getter(s.facts);
    if (got) return { ...got, confidence: Math.min(got.confidence, 0.3), classification: s.classification };
  }
  return null;
}

function incomeSourceLabel(c: DocumentType | null): string {
  switch (c) {
    case "BANK_STATEMENT":
      return "bank statements";
    case "PAYSTUB":
      return "paystub";
    case "APPFOLIO_APPLICATION":
      return "stated on application";
    default:
      return c ? labelForDocumentType(c).toLowerCase() : "unknown source";
  }
}

function computeCrossDocNotes(perDoc: PerDocResult[], input: ExtractionInput): string {
  const notes: string[] = [];

  // Name mismatch: any per-doc `fullName` that diverges from the case's applicant
  // record by more than trivial spacing/case differences.
  for (const applicant of input.applicants) {
    const expected = normalize(applicant.fullName);
    const observed = new Set<string>();
    for (const d of perDoc) {
      const got = d.applicants.find((x) => x.applicantId === applicant.id);
      if (!got || !got.fullName) continue;
      const n = normalize(got.fullName);
      if (n && n !== expected) observed.add(got.fullName.trim());
    }
    if (observed.size > 0) {
      notes.push(
        `• Name mismatch for ${applicant.fullName}: documents reference ${[...observed].map((s) => `"${s}"`).join(", ")}. Verify identity before sending applicant comms.`
      );
    }
  }

  // No screening report present but we have other docs → can't decide on credit/criminal.
  const hasScreening = perDoc.some((d) => d.classification === "SMARTMOVE_REPORT");
  if (!hasScreening && perDoc.length > 0) {
    notes.push("• No screening report among the uploaded documents — credit / criminal / eviction flags unknown.");
  }

  return notes.join("\n");
}

function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

// ─── Per-doc user prompt ───────────────────────────────────────────────────

function buildPerDocPrompt(
  doc: ExtractionDocumentInput,
  input: ExtractionInput
): string {
  const applicants = input.applicants
    .map((a) => `- id=${a.id}: ${a.fullName} <${a.email}>`)
    .join("\n");

  const propertyAddress = [
    input.property.addressLine1,
    input.property.propertyAddressLine2,
    `${input.property.city}, ${input.property.state}`,
  ]
    .filter(Boolean)
    .join(", ");

  const rentDollars = (input.property.rentCents / 100).toFixed(0);
  const section8Line = input.property.isSection8
    ? `- Section 8: yes; tenant portion = ${
        input.property.voucherTenantPortionCents != null
          ? `$${(input.property.voucherTenantPortionCents / 100).toFixed(0)}/mo`
          : "unknown"
      }`
    : "- Section 8: no";

  return `Case ID: ${input.caseId}

Property:
- ${propertyAddress}
- ${input.property.bedrooms} bed · $${rentDollars}/mo rent
${section8Line}

Applicants on this case (use these IDs in your output):
${applicants}

You are reviewing **one document**:
- ID: ${doc.id}
- Classification: ${labelForDocumentType(doc.classification)}
- Filename: ${doc.filename}

Read this document and return the per-applicant facts. Only populate what THIS document tells you; leave other fields null / empty. Other documents in this case are being processed in parallel by other passes — they'll be merged in code.`;
}

// ─── Content-block builder (PDF→text with visual fallback, unchanged) ─────

// Minimum extracted-text length before we trust the text layer.
const MIN_TEXT_LAYER_CHARS = 100;

async function documentToContentBlocks(
  d: ExtractionDocumentInput
): Promise<Array<Record<string, unknown>>> {
  const mime = (d.mimeType || "").toLowerCase();

  if (mime === "application/pdf") {
    const buffer = await downloadCaseDocument(d.storagePath);
    const { text, pages } = await extractPdfText(buffer);
    if (text.trim().length >= MIN_TEXT_LAYER_CHARS) {
      const header = `=== Document ${d.id} · ${labelForDocumentType(d.classification)} · ${d.filename} (${pages} page${pages === 1 ? "" : "s"}, text layer) ===`;
      const footer = `=== End document ${d.id} ===`;
      return [{ type: "text", text: `${header}\n${text}\n${footer}` }];
    }
    const url = await getSignedUrl(d.storagePath, 600);
    return [
      {
        type: "text",
        text: `Document ${d.id} (${d.filename}) has no extractable text layer — passing as visual PDF below.`,
      },
      {
        type: "document",
        source: { type: "url", url },
        title: `${labelForDocumentType(d.classification)} — ${d.filename}`,
        context: `documentId=${d.id}`,
      },
    ];
  }

  if (mime.startsWith("image/")) {
    const url = await getSignedUrl(d.storagePath, 600);
    return [
      {
        type: "text",
        text: `Document ${d.id} · ${labelForDocumentType(d.classification)} · ${d.filename} (image)`,
      },
      { type: "image", source: { type: "url", url } },
    ];
  }

  return [];
}
