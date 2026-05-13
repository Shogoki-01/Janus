// Recommendation generator — turns extracted facts + an engine decision into
// **four parallel scenarios** of copy-pasteable templates an operator can pick
// between: deny, approve (1× deposit), approve with 2× deposit, approve with
// 3× deposit. For each scenario we produce three artifacts: a Slack message,
// an internal email to the team, and an applicant-facing letter.
//
// Internal copy stays operator-friendly (terse, plainspoken). Applicant copy
// is professional + warm for approvals, FCRA-aligned for denials.
//
// Server-only. Uses the Anthropic SDK with structured outputs to guarantee
// the 4-scenario × 3-template shape.

import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { DecisionResult } from "@/lib/decide";
import { breakdownFees, type LeaseFeeFlags } from "@/lib/fees";
import type { DossierOutput, ScenarioOutcome } from "./dossier-types";

// Re-export the public types for callers that already import from this module.
export type { DossierOutput, ScenarioOutcome, ScenarioTemplates } from "./dossier-types";
export {
  SCENARIO_OUTCOMES,
  SCENARIO_LABELS,
  decisionToScenarioOutcome,
} from "./dossier-types";

const MODEL = "claude-sonnet-4-6";

const client = new Anthropic();

export type DossierFacts = {
  applicantName: string;
  applicantEmail: string;
  propertyAddress: string;
  rentCents: number;
  bedrooms: number;
  isSection8: boolean;
  voucherTenantPortionCents: number | null;
  /** Optional per-case lease fees toggled at intake / on the detail page. */
  fees: LeaseFeeFlags;
  monthlyIncomeCents: number | null;
  incomeConfidence: number;
  incomeSource: string | null;
  creditScore: number | null;
  creditConfidence: number;
  criminalSeverity: "NONE" | "MINOR" | "MAJOR" | "UNKNOWN";
  evictionFlag: boolean | null;
  bankruptcies: number | null;
  evidenceNotes: string;
  crossDocNotes: string;
  decision: DecisionResult;
  recommendedOutcome: ScenarioOutcome;
};

// ─── System prompt (cacheable) ─────────────────────────────────────────────

const DOSSIER_SYSTEM = `You write screening-recommendation packets for an internal property-management team that runs on AppFolio. For one rental case, you produce **four parallel scenarios** the operator can choose between, and for each scenario you write **three artifacts**:

**Scenarios:**
- DENY: Reject this application.
- APPROVE: Approve with a standard 1× security deposit (one month's rent).
- APPROVE_2X_DEPOSIT: Approve conditionally with a 2× security deposit (two months' rent) — used to mitigate credit-score or income concerns.
- APPROVE_3X_DEPOSIT: Approve conditionally with a 3× security deposit (three months' rent) — used when concerns are more substantial (older negative items, thin credit file, etc.). Note: only available where the jurisdiction permits.

**Artifacts per scenario:**
1. \`slack\` — internal Slack message announcing the recommendation. Operator-friendly, terse, plainspoken. Lead with the recommendation in *single asterisks* for Slack bold. Bullet the key facts (income vs. required, credit, flags). One-line "why" if non-obvious. Max 10 lines. No emoji. No headers.
2. \`internalEmail\` — internal email to the team. First line is the subject (\`Janus recommendation: <applicant name> — <scenario label>\`), then a blank line, then the body. "Hi team," greeting. 2–3 short paragraphs: (a) the recommendation + one-sentence why, (b) the underlying numbers, (c) any concerns or low-confidence facts the team should verify. Close with "Let me know if you want the full dossier." and a sign-off line "— Janus".
3. \`applicantEmail\` — letter to the applicant. Format: first line is the subject, blank line, then the body.
   - For **APPROVE / APPROVE_2X_DEPOSIT / APPROVE_3X_DEPOSIT**: a warm approval/welcome email. Professional but human. State the property, the monthly rent, the security-deposit amount in dollars (calculated from rent × multiplier), and brief next steps (sign the lease, pay the deposit + first month, schedule move-in). Invite questions. Use "We're glad to offer you the unit at <address>" framing. Sign off "The team at My New Rental".
   - For **DENY**: an FCRA-aligned adverse action notice — generic, vendor-neutral. The applicant has a right to know: (a) that adverse action was taken on their rental application, (b) the decision was based in part on information from a consumer reporting agency, (c) the applicant has a right to dispute the accuracy of that report and to obtain a free copy from the reporting agency within 60 days. **Do NOT name the screening provider** (no "TransUnion", "SmartMove", "Experian", etc.) — write \`[CONSUMER REPORTING AGENCY]\` as a placeholder the operator will fill in before sending. **Do NOT** state the specific reason for denial (no "your credit was too low" — adverse action notices reference the report, not the operator's interpretation). Tone: professional, respectful, brief. Sign off "The team at My New Rental".

**Rules:**
- Use the **actual numbers** in every artifact (income, rent, credit, multiplier, deposit calculations).
- Deposit calculations: APPROVE = rent × 1, APPROVE_2X_DEPOSIT = rent × 2, APPROVE_3X_DEPOSIT = rent × 3. Compute the dollar amount and include it.
- Flag any low-confidence facts (<0.5) in internal templates as needing operator verification.
- Internal copy: operator-friendly, terse, no FCRA boilerplate.
- Applicant copy: professional, warm or respectful as appropriate. Approval emails are welcoming; the denial letter is short and compliance-correct.

**Vocabulary forbidden in all output:**
- **Specific screening providers** — never write "TransUnion", "SmartMove", "Experian", "Equifax", "TU SmartMove", or any other vendor name. Use generic phrases like "screening report" or "consumer reporting agency" (or the \`[CONSUMER REPORTING AGENCY]\` placeholder in adverse-action notices).
- **"Manual review" / "Janus manual review" / "MANUAL_REVIEW"** — never reference this phrase or any internal engine-state vocabulary in the operator-facing or applicant-facing copy. The operator picks one of the four scenarios (deny / approve / approve 2× / approve 3×); their decision is the one that ships. If the engine couldn't decide, you still write all four scenarios cleanly.
- **Internal label names** — never refer to "Janus" in the applicant emails (it's our internal tool — applicants don't know about it). "Janus" may appear in internal Slack / email sign-offs only.

**Lease fees handling:**
- Optional lease fees (Internet & Cable, Resident Benefits Package, One-Time Admin Fee) are toggled per case. The active ones (with dollar amounts) and the **Total monthly** and **Total one-time at move-in** are precomputed in the user prompt.
- For **APPROVE / APPROVE_2X_DEPOSIT / APPROVE_3X_DEPOSIT applicant emails**: when any monthly fees are active, list them itemized and show the resulting **Monthly total**. When the one-time admin fee is active, include it in a brief "At move-in:" section alongside the security deposit. When no fees are active, don't mention fees at all — the email should not include phantom $0 lines.
- For **internal Slack and email** in approve scenarios: mention the monthly total and the at-move-in one-time figure so the operator sees the full numbers at a glance. Don't enumerate each fee in Slack; one combined number is enough.
- **DENY scenario ignores fees** — fees don't apply to a denied applicant. Don't reference them in any DENY template.

**Most important rule — write all four scenarios fully.** The four scenarios are parallel alternatives the operator chooses between. Every \`slack\`, \`internalEmail\`, and \`applicantEmail\` field must contain a complete, plausible draft — never leave any field empty, truncated, "..." , "N/A", or marked "not applicable". The operator uses the toggle to compare what each outcome's communication would look like before deciding which one to send. Abbreviated or skipped scenarios defeat that comparison.

Write each scenario as if the operator picked that outcome:
- If a scenario looks inconsistent with the facts (e.g. uploaded documents don't match the applicant, or income is too low to plausibly approve), still produce the full template. In the **internal** templates for that scenario, add one explicit caution line stating the inconsistency so the operator knows the trade-off. The **applicant-facing** template stays clean and on-brand — write it as it would read if the operator decided to go ahead.
- If a fact is unknown (e.g. credit score wasn't extracted), use a reasonable placeholder phrasing like "based on the screening report" rather than fabricating numbers. Don't invent specifics that weren't in the inputs.

Output strictly conforms to the provided JSON schema. No prose outside the JSON.`;

// ─── JSON schema ───────────────────────────────────────────────────────────

const scenarioShape = {
  type: "object",
  additionalProperties: false,
  required: ["slack", "internalEmail", "applicantEmail"],
  properties: {
    slack: { type: "string" },
    internalEmail: { type: "string" },
    applicantEmail: { type: "string" },
  },
} as const;

const DOSSIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scenarios"],
  properties: {
    scenarios: {
      type: "object",
      additionalProperties: false,
      required: ["DENY", "APPROVE", "APPROVE_2X_DEPOSIT", "APPROVE_3X_DEPOSIT"],
      properties: {
        DENY: scenarioShape,
        APPROVE: scenarioShape,
        APPROVE_2X_DEPOSIT: scenarioShape,
        APPROVE_3X_DEPOSIT: scenarioShape,
      },
    },
  },
} as const;

// ─── Entry ─────────────────────────────────────────────────────────────────

export async function generateDossier(facts: DossierFacts): Promise<DossierOutput> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: DOSSIER_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildDossierPrompt(facts),
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output_config: {
      format: { type: "json_schema", schema: DOSSIER_SCHEMA },
    } as any,
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude refused to generate dossier — review manually.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Dossier generation returned no text content.");
  }

  return JSON.parse(textBlock.text) as DossierOutput;
}

// ─── Prompt builder ────────────────────────────────────────────────────────

function buildDossierPrompt(f: DossierFacts): string {
  const rentCents = f.rentCents;
  const rent = `$${(rentCents / 100).toFixed(0)}/mo`;
  const deposit1x = `$${(rentCents / 100).toFixed(0)}`;
  const deposit2x = `$${((rentCents * 2) / 100).toFixed(0)}`;
  const deposit3x = `$${((rentCents * 3) / 100).toFixed(0)}`;

  const feeBreakdown = breakdownFees(f.fees);
  const monthlyTotalCents = rentCents + feeBreakdown.monthlyFeesCents;
  const feesBlock = (() => {
    if (feeBreakdown.monthly.length === 0 && feeBreakdown.oneTime.length === 0) {
      return "Lease fees: none (no add-ons toggled on this lease).";
    }
    const lines: string[] = ["Lease fees applicable to this lease:"];
    for (const m of feeBreakdown.monthly) {
      lines.push(`  · ${m.label}: $${(m.cents / 100).toFixed(0)} / month`);
    }
    for (const o of feeBreakdown.oneTime) {
      lines.push(`  · ${o.label}: $${(o.cents / 100).toFixed(0)} one-time (at move-in)`);
    }
    lines.push(
      `Total monthly (rent + recurring fees): $${(monthlyTotalCents / 100).toFixed(0)} / month`
    );
    if (feeBreakdown.oneTimeFeesCents > 0) {
      lines.push(
        `Total one-time at move-in (excluding security deposit): $${(feeBreakdown.oneTimeFeesCents / 100).toFixed(0)}`
      );
    }
    return lines.join("\n");
  })();
  const income =
    f.monthlyIncomeCents != null
      ? `$${(f.monthlyIncomeCents / 100).toFixed(0)}/mo (confidence ${f.incomeConfidence.toFixed(2)}, source: ${f.incomeSource ?? "n/a"})`
      : "not extracted";
  const credit =
    f.creditScore != null
      ? `${f.creditScore} (confidence ${f.creditConfidence.toFixed(2)})`
      : "no screening report";
  const voucherLine = f.isSection8
    ? `Section 8: yes; tenant portion ${
        f.voucherTenantPortionCents != null
          ? `$${(f.voucherTenantPortionCents / 100).toFixed(0)}/mo`
          : "unknown"
      }`
    : "Section 8: no";

  return `Generate the four-scenario dossier for this case.

Applicant: ${f.applicantName} <${f.applicantEmail}>
Property: ${f.propertyAddress}
Terms: ${f.bedrooms} bed · ${rent}
${voucherLine}

${feesBlock}

Deposit amounts to reference in each scenario:
- APPROVE (1×): ${deposit1x}
- APPROVE_2X_DEPOSIT (2×): ${deposit2x}
- APPROVE_3X_DEPOSIT (3×): ${deposit3x}

Extracted facts:
- Income: ${income}
- Credit: ${credit}
- Criminal severity: ${f.criminalSeverity}
- Eviction: ${f.evictionFlag === null ? "no screening data" : f.evictionFlag ? "yes" : "no"}
- Bankruptcies: ${f.bankruptcies ?? "n/a"}

Evidence notes:
${f.evidenceNotes || "(none)"}

Cross-document reconciliation:
${f.crossDocNotes || "(none)"}

Suggested scenario for this case: ${f.recommendedOutcome}
Why (internal reasoning that informs the internal copy — do not paraphrase verbatim into output):
- ${f.decision.reason}
${f.decision.factors.map((x) => `- ${x}`).join("\n")}

Generate **all four scenarios** with their full slack / internalEmail / applicantEmail artifacts. The suggested scenario above informs the internal-template tone — write the internal copy for that scenario with slightly higher confidence (e.g. "Recommending [scenario]") — but every scenario gets a complete draft so the operator can compare them side-by-side in the UI toggle.`;
}
