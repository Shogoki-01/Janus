// ScreeningProvider — the contract that abstracts away how an applicant's
// credit/criminal/eviction report is obtained and ingested.
//
// MVP: only SmartMoveManualProvider ships. It models a manual handoff:
//   - requestReport()  → sends an email to the applicant with the landlord's
//                        SmartMove invite link, marks status INVITED.
//   - ingestReport()   → accepts the landlord's manual data entry (severity
//                        categorization + boolean eviction + credit score +
//                        bankruptcies + uploaded PDF), normalizes it into a
//                        NormalizedScreeningReport.
//   - getStatus()      → just reflects the per-applicant ScreeningStatus.
//
// v2: TazWorks/RentPrep/SingleKey providers implementing the same interface
// will fetch reports from a real CRA API. Because the interface is stable, the
// decision engine and data model don't change.
//
// Caller responsibilities (out of scope for this file):
//   - Loading the applicant + consent record from the DB.
//   - Performing the actual email send / storage upload.
//   - Writing the resulting ScreeningReport row + updating the Applicant.
// The provider methods are pure transforms; I/O lives at the call sites in
// tRPC procedures / Inngest functions.

import type { CriminalSeverity } from "@/lib/decide";

// ───────────────────────── Detail types ─────────────────────────

export type CriminalFlag = {
  /** Category label — comes from the SmartMove PDF, free-form string. */
  category: string;
  date?: string; // ISO
  description?: string;
  /** Landlord-assigned severity (when known) — the bit the engine actually uses. */
  severity?: CriminalSeverity;
};

export type EvictionFlag = {
  date?: string; // ISO
  jurisdiction?: string;
  description?: string;
};

// ───────────────────────── Inputs ─────────────────────────

/**
 * Captured before any report is requested. The ScreeningProvider stores
 * enough of this in audit-trail form that an FCRA dispute can be served.
 */
export type ConsentRecord = {
  applicantId: string;
  // We collect two separate consents: (a) for OUR processing, (b) for
  // TransUnion to pull the report. Both must be present.
  consentedToOurProcessingAt: Date;
  consentedToCRAPullAt: Date;
  /** IP captured at consent time. */
  ipAddress: string;
  /** UA captured at consent time. */
  userAgent: string;
  /** Path to e-signature artifact (image or signed-text record). */
  signatureArtifactPath?: string;
};

export type ApplicantSummary = {
  id: string;
  email: string;
  fullName: string;
  /** Property address used to pre-fill the SmartMove invite. */
  propertyAddress: string;
};

/**
 * The MVP shape the landlord types in from the SmartMove PDF. v2 providers
 * will fill this from a parsed API response instead.
 */
export type ManualReportEntry = {
  applicantId: string;
  /** 300–850. Out-of-range values are caller-rejected before reaching us. */
  creditScore: number;
  /** TransUnion ResidentScore (different scale, optional at MVP). */
  residentScore?: number;
  hasCriminalRecords: boolean;
  criminalFlags: CriminalFlag[];
  /** Landlord's overall categorization — drives the decision engine. */
  hasCriminalFlagsSeverity: CriminalSeverity;
  hasEvictionRecords: boolean;
  evictionFlags: EvictionFlag[];
  bankruptcies: number;
  /** Path inside Supabase Storage to the uploaded report PDF. */
  rawPdfStoragePath: string;
  /** User ID of the landlord/admin doing the data entry, for AuditLog. */
  ingestedByUserId: string;
};

// ───────────────────────── Outputs ─────────────────────────

export type ScreeningRequest = {
  /** Provider-specific request handle. Stored on the Applicant for later lookup. */
  requestId: string;
  status: ScreeningRequestStatus;
};

export type ScreeningRequestStatus = "PENDING" | "COMPLETE" | "ERROR";

export type NormalizedScreeningReport = {
  creditScore: number | null;
  residentScore: number | null;
  hasCriminalRecords: boolean;
  criminalFlags: CriminalFlag[];
  /** The single bit the decision engine reads. */
  hasCriminalFlagsSeverity: CriminalSeverity;
  hasEvictionRecords: boolean;
  evictionFlags: EvictionFlag[];
  bankruptcies: number;
  /** Storage path to the source PDF. */
  rawPdfStoragePath: string;
  provider: string;
  fetchedAt: Date;
};

// ───────────────────────── Interface ─────────────────────────

export interface ScreeningProvider {
  readonly name: string;

  /**
   * Kick off a report. For SmartMoveManualProvider this emits an invite email.
   * For an API-based v2 provider this would call the CRA API.
   */
  requestReport(
    applicant: ApplicantSummary,
    consent: ConsentRecord
  ): Promise<ScreeningRequest>;

  /**
   * Convert provider-specific report data into the normalized shape stored on
   * ScreeningReport.normalizedData. For SmartMove this is the landlord's
   * manual form submission; for v2 this is the parsed API response.
   */
  ingestReport(rawData: unknown): Promise<NormalizedScreeningReport>;

  /**
   * Where is this report in its lifecycle? For SmartMoveManualProvider this
   * is derived from the Applicant.screeningStatus column. For v2 this would
   * poll the CRA API.
   */
  getStatus(requestId: string): Promise<ScreeningRequestStatus>;
}

// ───────────────────────── SmartMoveManualProvider ─────────────────────────

/**
 * Minimum viable provider. Treats the SmartMove flow as a human-in-the-loop
 * process: we never call TransUnion ourselves, we just track the lifecycle
 * around what the applicant and landlord do off-platform.
 *
 * I/O is injected via the constructor so callers can wire in Resend, Supabase
 * Storage, and the Prisma client without this module importing them directly
 * (keeps the provider pure-ish and testable).
 */
export type SmartMoveDeps = {
  /** Send the invite email. Returns a delivery handle for AuditLog. */
  sendInviteEmail(args: {
    to: string;
    applicantName: string;
    propertyAddress: string;
    smartmoveInviteUrl: string;
  }): Promise<{ messageId: string }>;
  /** Build the SmartMove invite URL. For MVP this is mysmartmove.com with applicant pre-fill. */
  buildSmartMoveInviteUrl(args: {
    applicantEmail: string;
    propertyAddress: string;
  }): string;
};

export class SmartMoveManualProvider implements ScreeningProvider {
  readonly name = "smartmove_manual";

  constructor(private readonly deps: SmartMoveDeps) {}

  async requestReport(
    applicant: ApplicantSummary,
    _consent: ConsentRecord
  ): Promise<ScreeningRequest> {
    const url = this.deps.buildSmartMoveInviteUrl({
      applicantEmail: applicant.email,
      propertyAddress: applicant.propertyAddress,
    });
    await this.deps.sendInviteEmail({
      to: applicant.email,
      applicantName: applicant.fullName,
      propertyAddress: applicant.propertyAddress,
      smartmoveInviteUrl: url,
    });
    // For MVP, our request handle is just the applicant id — the lifecycle
    // lives on the Applicant row in our DB.
    return { requestId: applicant.id, status: "PENDING" };
  }

  async ingestReport(rawData: unknown): Promise<NormalizedScreeningReport> {
    const entry = rawData as ManualReportEntry;
    if (entry.creditScore < 300 || entry.creditScore > 850) {
      throw new Error(
        `Credit score ${entry.creditScore} outside valid range 300–850`
      );
    }
    return {
      creditScore: entry.creditScore,
      residentScore: entry.residentScore ?? null,
      hasCriminalRecords: entry.hasCriminalRecords,
      criminalFlags: entry.criminalFlags,
      hasCriminalFlagsSeverity: entry.hasCriminalFlagsSeverity,
      hasEvictionRecords: entry.hasEvictionRecords,
      evictionFlags: entry.evictionFlags,
      bankruptcies: entry.bankruptcies,
      rawPdfStoragePath: entry.rawPdfStoragePath,
      provider: this.name,
      fetchedAt: new Date(),
    };
  }

  async getStatus(_requestId: string): Promise<ScreeningRequestStatus> {
    // The lifecycle bit lives on Applicant.screeningStatus, populated by the
    // tRPC procedure that drives the manual flow. This provider method exists
    // for interface symmetry; callers should usually read the DB directly.
    return "PENDING";
  }
}
