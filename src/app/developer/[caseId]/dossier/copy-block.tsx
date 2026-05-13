"use client";

import { useState } from "react";

export function CopyBlock({
  label,
  description,
  text,
  monospace = false,
}: {
  label: string;
  description: string;
  text: string;
  monospace?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: select + execCommand for older browsers / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <section
      className="overflow-hidden rounded-[12px]"
      style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
    >
      <header
        className="flex items-start justify-between gap-3 px-4 py-3"
        style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="min-w-0">
          <h3
            className="text-[12px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--ink-2)" }}
          >
            {label}
          </h3>
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--ink-3)" }}>
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors"
          style={{
            background: copied ? "var(--ok-tint)" : "var(--surface)",
            color: copied ? "var(--ok)" : "var(--ink-2)",
            border: `1px solid ${copied ? "var(--ok-soft)" : "var(--hairline-strong)"}`,
          }}
        >
          {copied ? <IconCheck /> : <IconClipboard />}
          {copied ? "Copied" : "Copy"}
        </button>
      </header>
      <pre
        className="px-4 py-3 text-[12.5px] leading-[1.55] whitespace-pre-wrap break-words"
        style={{
          color: "var(--ink)",
          fontFamily: monospace
            ? "var(--font-mono)"
            : "var(--font-sans)",
        }}
      >
        {text}
      </pre>
    </section>
  );
}

function IconClipboard() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="3" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
