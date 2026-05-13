"use client";

// Submit button that shows a pending spinner + "Analyzing… up to ~60s" text
// while the server action runs. Without this, the form sits silent for the
// entire Claude PDF read, which looks like nothing is happening.

import { useFormStatus } from "react-dom";

export function GenerateButton({ label = "Generate recommendation" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="group inline-flex items-center gap-2.5 rounded-[10px] px-5 py-3 text-[14px] font-semibold transition-all"
        style={{
          background: pending
            ? "var(--primary-press)"
            : "linear-gradient(180deg, var(--primary-hover) 0%, var(--primary) 100%)",
          color: "var(--on-primary)",
          boxShadow: pending ? "none" : "var(--sh-1)",
          cursor: pending ? "wait" : "pointer",
          letterSpacing: "-0.005em",
        }}
      >
        {pending ? (
          <>
            <Spinner /> Analyzing documents…
          </>
        ) : (
          <>
            <IconSparkle />
            {label}
          </>
        )}
      </button>
      <p className="mt-2.5 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
        {pending
          ? "Claude is reading PDFs and reconciling facts. Don't close the tab — this takes 15–90s."
          : "Claude reads each PDF, extracts per-applicant facts, runs the Janus decision engine, and writes Slack + email copy. ~15–90s."}
      </p>
    </>
  );
}

export function RegenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[12px] font-medium hover:underline"
      style={{ color: pending ? "var(--ink-3)" : "var(--primary)", cursor: pending ? "wait" : "pointer" }}
    >
      {pending ? "Regenerating…" : "Regenerate"}
    </button>
  );
}

// Top-of-page regenerate — more visible than the footer link. Always shown
// when a dossier already exists so the operator doesn't have to scroll past
// the toggle + facts table to find it.
export function HeaderRegenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
      style={{
        background: pending ? "var(--surface-2)" : "var(--surface)",
        color: pending ? "var(--ink-3)" : "var(--ink-2)",
        border: "1px solid var(--hairline-strong)",
        cursor: pending ? "wait" : "pointer",
        letterSpacing: "-0.005em",
      }}
    >
      {pending ? (
        <>
          <Spinner /> Regenerating…
        </>
      ) : (
        <>
          <IconRefresh /> Regenerate
        </>
      )}
    </button>
  );
}

function IconRefresh() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      style={{ animation: "janus-spin 700ms linear infinite" }}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8L12 3z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M18.5 14l.9 2.3L21.7 17l-2.3.7-.9 2.3-.9-2.3L15.3 17l2.3-.7.9-2.3z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}
