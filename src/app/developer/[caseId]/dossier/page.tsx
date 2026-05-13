// /developer/[caseId]/dossier — internal screening recommendation packet.
//
// Renders the Claude-generated Slack + email blocks, the decision banner, and
// the supporting facts. If the case hasn't been analyzed yet, shows a "Run
// analysis" CTA that triggers the server action.

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { DecisionResult, StackedDecision } from "@/lib/decide";
import type { ExtractedApplicant } from "@/lib/providers/extractor";
import type { DossierOutput, ScenarioOutcome } from "@/lib/providers/dossier-types";
import { generateRecommendationAction } from "../../actions";
import { formatUSD } from "@/lib/format";
import { DossierToggle } from "./dossier-toggle";
import { GenerateButton, HeaderRegenerateButton, RegenerateButton } from "./generate-button";

type AnalysisResult = {
  applicants: ExtractedApplicant[];
  crossDocNotes: string;
  decision: DecisionResult;
  recommendedOutcome: ScenarioOutcome;
  dossier: DossierOutput;
  generatedAt: string;
  model: string;
};

/** Old-shape dossier (pre-4-scenario) — used to detect cases that need regeneration. */
type LegacyAnalysisResult = {
  decision: DecisionResult;
  dossier: { slack: string; email: string };
};

function isLegacyAnalysis(
  a: AnalysisResult | LegacyAnalysisResult | null
): a is LegacyAnalysisResult {
  if (!a) return false;
  // Legacy dossier had `slack` + `email` at the top of `dossier`; new shape has `scenarios`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!a.dossier && !(a.dossier as any).scenarios;
}

export default async function DossierPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  const app = await db.application.findUnique({
    where: { id: caseId },
    include: {
      property: true,
      primaryApplicant: true,
      applicants: { include: { documents: true } },
    },
  });
  if (!app || !app.property || !app.primaryApplicant) notFound();

  const analysisRaw = app.analysisResult as AnalysisResult | LegacyAnalysisResult | null;
  const analysis = analysisRaw && !isLegacyAnalysis(analysisRaw) ? (analysisRaw as AnalysisResult) : null;
  const hasLegacy = isLegacyAnalysis(analysisRaw);
  const allDocs = app.applicants.flatMap((a) => a.documents);

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center gap-3">
          <JanusMark />
          <span className="text-[14px] font-semibold tracking-tight">Janus</span>
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>/</span>
          <Link
            href="/developer"
            className="text-[13px] hover:underline"
            style={{ color: "var(--ink-2)" }}
          >
            Cases
          </Link>
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>/</span>
          <Link
            href={`/developer/${app.id}`}
            className="text-[13px] hover:underline"
            style={{ color: "var(--ink-2)" }}
          >
            {app.primaryApplicant.fullName ?? app.primaryApplicant.email}
          </Link>
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>/</span>
          <span className="text-[13px]" style={{ color: "var(--ink)" }}>
            Dossier
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-3)" }}
            >
              Step 4 of 4 · Dossier
            </p>
            <h1
              className="mt-1 text-[22px] font-semibold leading-tight tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              Screening recommendation
            </h1>
          </div>
          {analysis && (
            <form action={generateRecommendationAction.bind(null, app.id)}>
              <HeaderRegenerateButton />
            </form>
          )}
        </div>

        {analysis ? (
          <DossierContent
            analysis={analysis}
            caseId={app.id}
            rentCents={app.property.rentCents}
            isSection8={app.isSection8}
            voucherTenantPortionCents={
              (app.voucherInfo as { tenantPortionCents?: number } | null)?.tenantPortionCents ?? null
            }
          />
        ) : (
          <EmptyState caseId={app.id} docCount={allDocs.length} hasLegacy={hasLegacy} />
        )}
      </main>
    </div>
  );
}

// ─── Components ────────────────────────────────────────────────────────────

function EmptyState({
  caseId,
  docCount,
  hasLegacy,
}: {
  caseId: string;
  docCount: number;
  hasLegacy: boolean;
}) {
  const generateForCase = generateRecommendationAction.bind(null, caseId);
  const title = hasLegacy
    ? "Regenerate to unlock scenario toggles"
    : docCount === 0
      ? "Upload documents first"
      : "Generate an AI recommendation";
  const description = hasLegacy
    ? "This case has an older dossier from before the 4-scenario toggle. Regenerate to get the deny / approve / 2× / 3× variants and per-scenario Slack, internal email, and applicant letters."
    : docCount === 0
      ? "No documents on file. Upload the operator packet so Janus has something to read."
      : `Claude will read the ${docCount} attached document${docCount === 1 ? "" : "s"}, extract per-applicant facts, run the Janus decision engine, and write four parallel scenarios (deny / approve / approve 2× / approve 3×) — each with a Slack message, an internal email, and an applicant-facing letter.`;
  return (
    <section
      className="mt-6 rounded-[12px] p-6 text-center"
      style={{
        border: "1px dashed var(--hairline-strong)",
        background: "var(--surface-2)",
      }}
    >
      <div
        className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-[8px]"
        style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
      >
        <IconSparkle />
      </div>
      <h2
        className="mt-3 text-[15px] font-semibold tracking-tight"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h2>
      <p
        className="mt-1 mx-auto max-w-md text-[12.5px]"
        style={{ color: "var(--ink-3)" }}
      >
        {description}
      </p>
      {docCount > 0 && (
        <form action={generateForCase} className="mt-4">
          <GenerateButton label={hasLegacy ? "Regenerate dossier" : "Generate recommendation"} />
        </form>
      )}
    </section>
  );
}

function DossierContent({
  analysis,
  caseId,
  rentCents,
  isSection8,
  voucherTenantPortionCents,
}: {
  analysis: AnalysisResult;
  caseId: string;
  rentCents: number;
  isSection8: boolean;
  voucherTenantPortionCents: number | null;
}) {
  const regenerate = generateRecommendationAction.bind(null, caseId);
  const primary = analysis.applicants[0];
  return (
    <div className="mt-6 space-y-5">
      <DecisionBanner decision={analysis.decision} />

      {primary && (
        <ApplicantSummaryGrid
          applicant={primary}
          rentCents={rentCents}
          isSection8={isSection8}
          voucherTenantPortionCents={voucherTenantPortionCents}
        />
      )}

      <DossierToggle dossier={analysis.dossier} suggested={analysis.recommendedOutcome} />

      <footer
        className="flex items-center justify-between rounded-[10px] px-4 py-3 text-[12px]"
        style={{
          background: "var(--surface-2)",
          color: "var(--ink-3)",
        }}
      >
        <span>
          Generated {new Date(analysis.generatedAt).toLocaleString()} · model{" "}
          <span className="tnum">{analysis.model}</span>
        </span>
        <form action={regenerate}>
          <RegenerateButton />
        </form>
      </footer>
    </div>
  );
}

function DecisionBanner({ decision }: { decision: DecisionResult }) {
  const meta: Record<StackedDecision, { label: string; bg: string; fg: string; sub: string }> = {
    APPROVED: { label: "Approved", bg: "var(--ok-tint)", fg: "var(--ok)", sub: "Meets criteria" },
    CONDITIONAL_DOUBLE_DEPOSIT: {
      label: "Conditional · double deposit",
      bg: "var(--warn-tint)",
      fg: "var(--warn)",
      sub: "Credit below threshold",
    },
    DENIED: { label: "Denied", bg: "var(--bad-tint)", fg: "var(--bad)", sub: "Insufficient income" },
    MANUAL_REVIEW: {
      label: "Manual review",
      bg: "var(--info-tint)",
      fg: "var(--info)",
      sub: "Operator must decide",
    },
  };
  const m = meta[decision.result];
  return (
    <section
      className="rounded-[12px] p-5"
      style={{ border: "1px solid var(--hairline)", background: m.bg }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--ink-3)" }}
          >
            Janus decision
          </p>
          <h2
            className="mt-1 text-[20px] font-semibold tracking-tight"
            style={{ color: m.fg }}
          >
            {m.label}
          </h2>
          <p className="mt-1 text-[13px]" style={{ color: "var(--ink-2)" }}>
            {decision.reason}
          </p>
        </div>
      </div>
      {decision.factors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {decision.factors.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12.5px]"
              style={{ color: "var(--ink-2)" }}
            >
              <span
                className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full"
                style={{ background: m.fg }}
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Summary boxes ──────────────────────────────────────────────────────────
//
// Replaces the old facts table / cross-doc notes / per-document summaries
// with seven scan-at-a-glance KPI boxes for the primary applicant. Income
// and Credit are color-coded; the rest are descriptive boxes that Claude
// fills from the AppFolio application packet.

function ApplicantSummaryGrid({
  applicant,
  rentCents,
  isSection8,
  voucherTenantPortionCents,
}: {
  applicant: ExtractedApplicant;
  rentCents: number;
  isSection8: boolean;
  voucherTenantPortionCents: number | null;
}) {
  // Income pass/fail: 3× rent (or 3× tenant portion for Section 8 — HUD source-of-income).
  const incomeBasisCents =
    isSection8 && voucherTenantPortionCents != null ? voucherTenantPortionCents : rentCents;
  const requiredCents = Math.round(incomeBasisCents * 3);
  const incomeCents = applicant.monthlyIncomeCents;
  const incomePass = incomeCents != null && incomeCents >= requiredCents;

  // Credit: red <600, yellow ==600, green >600 (per spec).
  let creditTone: "bad" | "warn" | "ok" | "neutral";
  if (applicant.creditScore == null) creditTone = "neutral";
  else if (applicant.creditScore < 600) creditTone = "bad";
  else if (applicant.creditScore === 600) creditTone = "warn";
  else creditTone = "ok";

  // Show "—" for legacy analyses missing the new demographic fields.
  const householdSummary = applicant.householdSummary ?? "";
  const petsSummary = applicant.petsSummary ?? "";
  const vehiclesSummary = applicant.vehiclesSummary ?? "";
  const employerName = applicant.employerName ?? null;
  const employmentRole = applicant.employmentRole ?? null;
  const employmentTenureSummary = applicant.employmentTenureSummary ?? "";
  const priorResidenceSummary = applicant.priorResidenceSummary ?? "";

  const employmentLine =
    employerName ?? (employmentTenureSummary || employmentRole ? "Employed" : "");
  const employmentSub = [employmentRole, employmentTenureSummary]
    .filter((x): x is string => Boolean(x))
    .join(" · ");

  return (
    <section
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Applicant summary"
    >
      <Box label={`Income vs 3× ${isSection8 ? "tenant portion" : "rent"}`} tone={incomePass ? "ok" : "bad"}>
        <BoxBig>
          {incomeCents != null ? `${formatUSD(incomeCents, { decimals: 0 })}/mo` : "—"}
        </BoxBig>
        <BoxSub>
          {incomeCents == null
            ? "Income not extracted"
            : `Needs ${formatUSD(requiredCents, { decimals: 0 })}/mo${incomePass ? " · passes" : ` · short ${formatUSD(requiredCents - incomeCents, { decimals: 0 })}`}`}
        </BoxSub>
      </Box>

      <Box label="Credit" tone={creditTone}>
        <BoxBig>{applicant.creditScore ?? "—"}</BoxBig>
        <BoxSub>
          {applicant.creditScore == null
            ? "No screening report"
            : applicant.creditScore < 600
              ? "Below 600 — flag"
              : applicant.creditScore === 600
                ? "Exactly at threshold"
                : "Above 600"}
        </BoxSub>
      </Box>

      <Box label="Employment">
        <BoxBig>{employmentLine || "—"}</BoxBig>
        <BoxSub>{employmentSub || (employmentLine ? "" : "Not extracted")}</BoxSub>
      </Box>

      <Box label="Household">
        <BoxBig>
          {applicant.householdSize != null
            ? `${applicant.householdSize} occupant${applicant.householdSize === 1 ? "" : "s"}`
            : householdSummary
              ? "Household"
              : "—"}
        </BoxBig>
        <BoxSub>{householdSummary || (applicant.householdSize == null ? "Not extracted" : "")}</BoxSub>
      </Box>

      <Box label="Pets" tone={petsSummary ? undefined : "neutral"}>
        <BoxBig>{petsSummary || "None"}</BoxBig>
      </Box>

      <Box label="Vehicles" tone={vehiclesSummary ? undefined : "neutral"}>
        <BoxBig>{vehiclesSummary || "None"}</BoxBig>
      </Box>

      <Box label="Prior residence" colSpan="sm:col-span-2 lg:col-span-3">
        <BoxBig>{priorResidenceSummary || "—"}</BoxBig>
        {!priorResidenceSummary && <BoxSub>Not extracted</BoxSub>}
      </Box>
    </section>
  );
}

type BoxTone = "ok" | "bad" | "warn" | "neutral";

function Box({
  label,
  children,
  tone,
  colSpan,
}: {
  label: string;
  children: React.ReactNode;
  tone?: BoxTone;
  colSpan?: string;
}) {
  const toneStyles: Record<BoxTone, { border: string; accent: string }> = {
    ok: { border: "var(--ok-soft)", accent: "var(--ok)" },
    bad: { border: "var(--bad-soft)", accent: "var(--bad)" },
    warn: { border: "var(--warn-soft)", accent: "var(--warn)" },
    neutral: { border: "var(--hairline)", accent: "var(--ink-3)" },
  };
  const s = tone ? toneStyles[tone] : null;
  return (
    <article
      className={`rounded-[12px] p-4 ${colSpan ?? ""}`}
      style={{
        border: `1px solid ${s?.border ?? "var(--hairline)"}`,
        background: "var(--surface)",
        boxShadow: "var(--sh-1)",
      }}
    >
      <p
        className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--ink-3)" }}
      >
        {s && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: s.accent }}
            aria-hidden
          />
        )}
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </article>
  );
}

function BoxBig({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="tnum text-[18px] font-semibold leading-tight tracking-tight"
      style={{ color: "var(--ink)" }}
    >
      {children}
    </div>
  );
}

function BoxSub({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="mt-1 text-[12px] leading-snug" style={{ color: "var(--ink-3)" }}>
      {children}
    </div>
  );
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function JanusMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="var(--primary)" />
      <path d="M12 2a10 10 0 010 20V2z" fill="rgba(255,255,255,0.28)" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v6m0 6v6M3 12h6m6 0h6M5.6 5.6l4.2 4.2m4.4 4.4 4.2 4.2m0-12.8-4.2 4.2M9.8 14.2 5.6 18.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
