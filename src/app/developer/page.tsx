// /developer — Developer Mode case list.
//
// Internal reviewer surface (operator drag-drops AppFolio + screening docs,
// confirms extracted facts, generates an Internal Screening Packet). Desktop-
// first per Janus Design.md ("reviewer screens are denser and built for
// scanning, comparison, and repeated action").
//
// Data: fixtures (src/lib/data/cases.ts). Swap to Prisma `findMany` once
// Supabase is provisioned. Auth is a no-op stub — Developer Mode is private
// internal, real Supabase Auth gates this whole segment in a later slice.

import Link from "next/link";
import { listCases, type CaseStatus } from "@/lib/data/cases";
import { formatUSD } from "@/lib/format";

export default async function DeveloperCasesPage() {
  const cases = await listCases();

  return (
    <div className="flex flex-1 flex-col">
      <DeveloperTopBar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {/* Page header — recommendation-engine-style: title + counts + primary action */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-3)" }}
            >
              Developer Mode · Internal
            </p>
            <h1
              className="mt-1 text-[24px] font-semibold leading-tight tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              Screening cases
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
              {cases.length} case{cases.length === 1 ? "" : "s"} · {countByStatus(cases, "READY_FOR_REVIEW")} awaiting review
            </p>
          </div>
          <Link
            href="/developer/new"
            className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2.5 text-[14px] font-medium transition-colors"
            style={{ background: "var(--primary)", color: "var(--on-primary)" }}
          >
            New case
            <IconPlus />
          </Link>
        </div>

        {/* Cases table — full-width operational band per Janus Design.md */}
        <div
          className="mt-6 overflow-hidden rounded-[12px]"
          style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
        >
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <Th>Case</Th>
                <Th>Applicant</Th>
                <Th>Property</Th>
                <Th align="right">Rent</Th>
                <Th align="center">Docs</Th>
                <Th>Status</Th>
                <Th align="right">Updated</Th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center" style={{ color: "var(--ink-3)" }}>
                    No cases yet. Click <strong>New case</strong> to start one.
                  </td>
                </tr>
              ) : (
                cases.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{
                      borderTop: i === 0 ? "1px solid var(--hairline)" : "1px solid var(--hairline-soft)",
                    }}
                  >
                    <Td>
                      <Link
                        href={`/developer/${c.id}`}
                        className="tnum font-medium hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {c.id}
                      </Link>
                    </Td>
                    <Td>
                      <div className="font-medium" style={{ color: "var(--ink)" }}>
                        {c.primaryApplicantName}
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--ink-3)" }}>
                        {c.primaryApplicantEmail}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ color: "var(--ink)" }}>
                        {c.propertyAddressLine1}
                        {c.propertyAddressLine2 ? `, ${c.propertyAddressLine2}` : ""}
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--ink-3)" }}>
                        {c.propertyCity}, {c.propertyState} · {c.bedrooms} bed
                        {c.isSection8 && <span> · Section 8</span>}
                      </div>
                    </Td>
                    <Td align="right">
                      <span className="tnum" style={{ color: "var(--ink)" }}>
                        {formatUSD(c.rentCents, { decimals: 0 })}
                      </span>
                    </Td>
                    <Td align="center">
                      <span className="tnum" style={{ color: c.documentCount === 0 ? "var(--ink-3)" : "var(--ink)" }}>
                        {c.documentCount}
                      </span>
                    </Td>
                    <Td>
                      <StatusPill status={c.status} />
                    </Td>
                    <Td align="right">
                      <span className="tnum text-[12.5px]" style={{ color: "var(--ink-3)" }}>
                        {relativeTime(c.updatedAt)}
                      </span>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
          Fixtures-backed. Cases reset on dev-server restart until Supabase lands.
        </p>
      </main>
    </div>
  );
}

// ────────────────────────── helpers ──────────────────────────

function countByStatus(cases: Array<{ status: CaseStatus }>, status: CaseStatus): number {
  return cases.filter((c) => c.status === status).length;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ────────────────────────── inline components ──────────────────────────

function DeveloperTopBar() {
  return (
    <header
      className="flex items-center justify-between px-6 py-3"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      <div className="flex items-center gap-2">
        <JanusMark />
        <span className="text-[14px] font-semibold tracking-tight">Janus</span>
        <span
          className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ background: "var(--primary-soft-2)", color: "var(--primary)" }}
        >
          Developer Mode
        </span>
      </div>
      <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>
        Internal · fixtures-only
      </span>
    </header>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{
        color: "var(--ink-3)",
        textAlign: align,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <td className="px-4 py-3 align-top" style={{ textAlign: align }}>
      {children}
    </td>
  );
}

function StatusPill({ status }: { status: CaseStatus }) {
  const meta: Record<CaseStatus, { label: string; bg: string; fg: string }> = {
    INTAKE: { label: "Intake", bg: "var(--info-soft)", fg: "var(--info)" },
    EXTRACTING: { label: "Extracting", bg: "var(--warn-soft)", fg: "var(--warn)" },
    READY_FOR_REVIEW: { label: "Ready for review", bg: "var(--ok-soft)", fg: "var(--ok)" },
    DECISIONED: { label: "Decisioned", bg: "var(--primary-soft-2)", fg: "var(--primary)" },
  };
  const m = meta[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  );
}

function JanusMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="var(--primary)" />
      <path d="M12 2a10 10 0 010 20V2z" fill="rgba(255,255,255,0.28)" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
