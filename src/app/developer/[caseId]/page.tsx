// /developer/[caseId] — Developer Mode: single case detail.
//
// Shell only at this slice. Shows the case summary + a status-aware empty
// state for the upload step. The upload + classification + confirmation +
// dossier steps land in subsequent slices.

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCaseById,
  labelForDocumentType,
  listDocumentsByCaseId,
  type CaseStatus,
  type DocumentFixture,
} from "@/lib/data/cases";
import {
  breakdownFees,
  FEE_ADMIN_ONE_TIME_CENTS,
  FEE_INTERNET_CABLE_CENTS,
  FEE_RESIDENT_BENEFITS_CENTS,
} from "@/lib/fees";
import { formatUSD } from "@/lib/format";
import { updateCaseFeesAction } from "../actions";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const c = await getCaseById(caseId);
  if (!c) notFound();

  const documents = await listDocumentsByCaseId(c.id);

  return (
    <div className="flex flex-1 flex-col">
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center gap-3">
          <JanusMark />
          <span className="text-[14px] font-semibold tracking-tight">Janus</span>
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>
            /
          </span>
          <Link
            href="/developer"
            className="text-[13px] hover:underline"
            style={{ color: "var(--ink-2)" }}
          >
            Cases
          </Link>
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>
            /
          </span>
          <span className="tnum text-[13px] font-medium" style={{ color: "var(--ink)" }}>
            {c.id}
          </span>
        </div>
        <StatusPill status={c.status} />
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {/* Case header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-3)" }}
            >
              {c.primaryApplicantName} · {c.primaryApplicantEmail}
            </p>
            <h1
              className="mt-1 text-[22px] font-semibold leading-tight tracking-tight"
              style={{ color: "var(--ink)" }}
            >
              {c.propertyAddressLine1}
              {c.propertyAddressLine2 ? `, ${c.propertyAddressLine2}` : ""}
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
              {c.propertyCity}, {c.propertyState} · {c.bedrooms} bed ·{" "}
              <span className="tnum">{formatUSD(c.rentCents, { decimals: 0 })}/mo</span>
              {c.isSection8 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--info)" }}>Section 8</span>
                </>
              )}
            </p>
          </div>
          {documents.length > 0 && (
            <Link
              href={`/developer/${c.id}/dossier`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-4 py-2.5 text-[13px] font-medium"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
            >
              {c.status === "DECISIONED" || c.status === "READY_FOR_REVIEW"
                ? "View dossier"
                : "Generate recommendation"}
              <IconArrowRight />
            </Link>
          )}
        </div>

        {/* Status bar — 4 phases of the Developer Mode flow */}
        <div
          className="mt-6 grid grid-cols-4 overflow-hidden rounded-[12px]"
          style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
        >
          <Phase
            label="Intake"
            sub="Case basics"
            active={c.status === "INTAKE"}
            done={["EXTRACTING", "READY_FOR_REVIEW", "DECISIONED"].includes(c.status)}
            href={`/developer/${c.id}/upload`}
            borderRight
          />
          <Phase
            label="Extract"
            sub="Classify & OCR"
            active={c.status === "EXTRACTING"}
            done={["READY_FOR_REVIEW", "DECISIONED"].includes(c.status)}
            href={documents.length > 0 ? `/developer/${c.id}/upload` : undefined}
            borderRight
          />
          <Phase
            label="Review"
            sub="Confirm facts"
            active={c.status === "READY_FOR_REVIEW"}
            done={c.status === "DECISIONED"}
            href={documents.length > 0 ? `/developer/${c.id}/dossier` : undefined}
            borderRight
          />
          <Phase
            label="Dossier"
            sub="Generate packet"
            active={c.status === "DECISIONED"}
            href={documents.length > 0 ? `/developer/${c.id}/dossier` : undefined}
            done={false}
          />
        </div>

        {/* Next-step panel — drives the operator to whatever's next given the case status. */}
        {c.status === "INTAKE" ? (
          <UploadIntakeCTA caseId={c.id} />
        ) : (
          <DocumentsPanel caseId={c.id} documents={documents} status={c.status} />
        )}

        {/* Lease fees — editable here so the operator can toggle without recreating the case. */}
        <LeaseFeesPanel
          caseId={c.id}
          rentCents={c.rentCents}
          feeInternetCable={c.feeInternetCable}
          feeResidentBenefits={c.feeResidentBenefits}
          feeAdminOneTime={c.feeAdminOneTime}
        />

        {/* Metadata strip */}
        <dl
          className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-4"
          style={{ color: "var(--ink-3)" }}
        >
          <Meta label="Case ID" value={<span className="tnum">{c.id}</span>} />
          <Meta label="Jurisdiction" value={c.jurisdiction} />
          <Meta label="Created" value={new Date(c.createdAt).toLocaleString()} />
          <Meta label="Updated" value={new Date(c.updatedAt).toLocaleString()} />
        </dl>
      </main>
    </div>
  );
}

// ────────────────────────── components ──────────────────────────

function LeaseFeesPanel({
  caseId,
  rentCents,
  feeInternetCable,
  feeResidentBenefits,
  feeAdminOneTime,
}: {
  caseId: string;
  rentCents: number;
  feeInternetCable: boolean;
  feeResidentBenefits: boolean;
  feeAdminOneTime: boolean;
}) {
  const flags = { feeInternetCable, feeResidentBenefits, feeAdminOneTime };
  const breakdown = breakdownFees(flags);
  const monthlyTotal = rentCents + breakdown.monthlyFeesCents;
  const updateForCase = updateCaseFeesAction.bind(null, caseId);
  return (
    <section
      className="mt-6 overflow-hidden rounded-[12px]"
      style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)" }}
      >
        <h3
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--ink-3)" }}
        >
          Lease fees
        </h3>
        <span className="tnum text-[11.5px]" style={{ color: "var(--ink-3)" }}>
          Monthly total: {formatUSD(monthlyTotal, { decimals: 0 })}
          {breakdown.oneTimeFeesCents > 0 && (
            <>
              {" · One-time: "}
              {formatUSD(breakdown.oneTimeFeesCents, { decimals: 0 })}
            </>
          )}
        </span>
      </div>
      <form action={updateForCase} className="px-4 py-3">
        <div className="space-y-2">
          <FeeRow
            name="feeInternetCable"
            label="Internet & cable"
            amountCents={FEE_INTERNET_CABLE_CENTS}
            suffix="/ mo"
            defaultChecked={feeInternetCable}
          />
          <FeeRow
            name="feeResidentBenefits"
            label="Resident Benefits Package"
            amountCents={FEE_RESIDENT_BENEFITS_CENTS}
            suffix="/ mo"
            defaultChecked={feeResidentBenefits}
          />
          <FeeRow
            name="feeAdminOneTime"
            label="One-time admin fee"
            amountCents={FEE_ADMIN_ONE_TIME_CENTS}
            suffix="one-time"
            defaultChecked={feeAdminOneTime}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
            These flow into the approval email's monthly total + move-in line. Regenerate the dossier after changes.
          </p>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
            style={{
              background: "var(--surface)",
              color: "var(--ink-2)",
              border: "1px solid var(--hairline-strong)",
            }}
          >
            Save fees
          </button>
        </div>
      </form>
    </section>
  );
}

function FeeRow({
  name,
  label,
  amountCents,
  suffix,
  defaultChecked,
}: {
  name: string;
  label: string;
  amountCents: number;
  suffix: string;
  defaultChecked: boolean;
}) {
  return (
    <label
      className="flex items-center gap-3 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-[var(--surface-2)]"
      style={{ color: "var(--ink)" }}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 shrink-0"
        style={{ accentColor: "var(--primary)" }}
      />
      <span className="flex-1 text-[13px]">{label}</span>
      <span className="tnum text-[12.5px]" style={{ color: "var(--ink-2)" }}>
        {formatUSD(amountCents, { decimals: 0 })} {suffix}
      </span>
    </label>
  );
}

function UploadIntakeCTA({ caseId }: { caseId: string }) {
  return (
    <section
      className="mt-6 rounded-[12px] p-5"
      style={{ border: "1px dashed var(--hairline-strong)", background: "var(--surface-2)" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
        >
          <IconUpload />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                className="text-[14px] font-semibold tracking-tight"
                style={{ color: "var(--ink)" }}
              >
                Upload documents to begin extraction
              </h2>
              <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
                Drop the operator packet for this case. Janus classifies, extracts, and surfaces candidate facts for your confirmation.
              </p>
            </div>
            <Link
              href={`/developer/${caseId}/upload`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-medium"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
            >
              Upload documents
              <IconArrowRight />
            </Link>
          </div>
          <ul
            className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-3"
            style={{ color: "var(--ink-2)" }}
          >
            {[
              "AppFolio application",
              "Screening report",
              "Bank statements",
              "Paystubs",
              "Government ID",
              "Voucher / Section 8",
            ].map((doc) => (
              <li key={doc} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-1 w-1 rounded-full"
                  style={{ background: "var(--ink-4)" }}
                />
                {doc}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function DocumentsPanel({
  caseId,
  documents,
  status,
}: {
  caseId: string;
  documents: DocumentFixture[];
  status: CaseStatus;
}) {
  const totalBytes = documents.reduce((acc, d) => acc + d.sizeBytes, 0);
  return (
    <section
      className="mt-6 overflow-hidden rounded-[12px]"
      style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="flex items-baseline gap-3">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--ink-3)" }}
          >
            Documents
          </span>
          <span className="tnum text-[12px]" style={{ color: "var(--ink-3)" }}>
            {documents.length} · {fmtBytes(totalBytes)}
          </span>
        </div>
        <Link
          href={`/developer/${caseId}/upload`}
          className="text-[12px] font-medium hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Add more
        </Link>
      </div>
      {documents.length === 0 ? (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--ink-3)" }}>
          No documents on file. <Link href={`/developer/${caseId}/upload`} className="hover:underline" style={{ color: "var(--primary)" }}>Upload some</Link> to continue.
        </div>
      ) : (
        <ul>
          {documents.map((d, i) => (
            <li
              key={d.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--hairline-soft)" }}
            >
              <FileGlyph mime={d.mimeType} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px]" style={{ color: "var(--ink)" }}>
                  {d.filename}
                </div>
                <div className="tnum text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                  {fmtBytes(d.sizeBytes)} · {d.mimeType || "unknown"} · uploaded {new Date(d.uploadedAt).toLocaleTimeString()}
                </div>
              </div>
              <ClassificationPill classification={d.classification} status={status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ClassificationPill({
  classification,
  status,
}: {
  classification: DocumentFixture["classification"];
  status: CaseStatus;
}) {
  if (classification) {
    return (
      <span
        className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
      >
        {labelForDocumentType(classification)}
      </span>
    );
  }
  if (status === "EXTRACTING") {
    return (
      <span
        className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
      >
        Pending classify
      </span>
    );
  }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: "var(--info-soft)", color: "var(--info)" }}
    >
      Queued
    </span>
  );
}

function FileGlyph({ mime }: { mime: string }) {
  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  const label = isPdf ? "PDF" : isImage ? "IMG" : "···";
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-semibold tracking-wide"
      style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}
      aria-hidden
    >
      {label}
    </span>
  );
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
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

function Phase({
  label,
  sub,
  active,
  done,
  href,
  borderRight,
}: {
  label: string;
  sub: string;
  active?: boolean;
  done?: boolean;
  href?: string;
  borderRight?: boolean;
}) {
  const bg = active ? "var(--primary-soft)" : "transparent";
  const dotBg = done ? "var(--ok)" : active ? "var(--primary)" : "var(--ink-4)";
  const labelColor = active ? "var(--primary)" : done ? "var(--ink-2)" : "var(--ink-3)";
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full"
          style={{ background: dotBg, color: "white" }}
        >
          {done ? <IconCheckTiny /> : null}
        </span>
        <span
          className="text-[12px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: labelColor }}
        >
          {label}
        </span>
      </div>
      <p className="mt-1 ml-6 text-[11.5px]" style={{ color: "var(--ink-3)" }}>
        {sub}
      </p>
    </>
  );
  const containerStyle = {
    background: bg,
    borderRight: borderRight ? "1px solid var(--hairline)" : undefined,
  };
  if (href) {
    return (
      <Link
        href={href}
        className="block px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
        style={containerStyle}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="px-4 py-3" style={containerStyle}>
      {inner}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt
        className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </dt>
      <dd className="mt-0.5" style={{ color: "var(--ink-2)" }}>
        {value}
      </dd>
    </div>
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

function IconUpload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 16V4M6 10l6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 18v1a2 2 0 002 2h10a2 2 0 002-2v-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheckTiny() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
