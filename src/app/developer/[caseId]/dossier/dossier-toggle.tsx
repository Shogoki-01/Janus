"use client";

// Four-way segmented control + the three copy blocks for the selected
// scenario. The active scenario defaults to whatever the decision engine
// recommended ("Janus suggests") and the operator can flip between to
// preview each outcome's templates before picking one to send.

import { useState } from "react";
import { CopyBlock } from "./copy-block";
import {
  SCENARIO_LABELS,
  SCENARIO_OUTCOMES,
  type DossierOutput,
  type ScenarioOutcome,
} from "@/lib/providers/dossier-types";

export function DossierToggle({
  dossier,
  suggested,
}: {
  dossier: DossierOutput;
  suggested: ScenarioOutcome;
}) {
  const [selected, setSelected] = useState<ScenarioOutcome>(suggested);
  const templates = dossier.scenarios[selected];

  // For DENY the applicant letter is an adverse-action notice; for approve
  // outcomes it's a welcome/approval letter. Label flips accordingly.
  const applicantLabel = selected === "DENY" ? "Adverse action notice" : "Approval letter";
  const applicantDescription =
    selected === "DENY"
      ? "FCRA-aligned letter to the applicant. Brief, respectful, references the screening report. Paste into your applicant comms tool."
      : "Welcome / approval letter to the applicant. States the unit, rent, deposit, and next steps. Paste into your applicant comms tool.";

  return (
    <div className="space-y-5">
      {/* Segmented control */}
      <div
        className="grid grid-cols-2 gap-1.5 rounded-[12px] p-1 sm:grid-cols-4"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--hairline)",
        }}
      >
        {SCENARIO_OUTCOMES.map((opt) => {
          const isActive = opt === selected;
          const isSuggested = opt === suggested;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setSelected(opt)}
              className="relative rounded-[8px] px-3 py-2.5 text-[12.5px] font-semibold transition-colors"
              style={{
                background: isActive ? "var(--surface)" : "transparent",
                color: isActive
                  ? opt === "DENY"
                    ? "var(--bad)"
                    : "var(--ink)"
                  : "var(--ink-3)",
                boxShadow: isActive ? "var(--sh-1)" : "none",
                letterSpacing: "-0.005em",
              }}
            >
              <span>{SCENARIO_LABELS[opt]}</span>
              {isSuggested && (
                <span
                  className="absolute -top-1.5 right-1.5 rounded-full px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-[0.06em]"
                  style={{
                    background: "var(--primary)",
                    color: "var(--on-primary)",
                  }}
                >
                  Suggested
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Three artifacts for the selected scenario */}
      <CopyBlock
        label="Slack"
        description="Paste into your internal channel. Markdown-style bold with *asterisks*."
        text={templates.slack}
        monospace
      />
      <CopyBlock
        label="Internal email"
        description="Subject on the first line, then the body. Paste into Gmail / Outlook."
        text={templates.internalEmail}
      />
      <CopyBlock
        label={applicantLabel}
        description={applicantDescription}
        text={templates.applicantEmail}
      />
    </div>
  );
}
