// /developer/[caseId]/upload — drag/drop multi-file upload zone.
//
// Server shell only — the drag/drop interactions live in the client component
// below. Submitting triggers the `uploadDocumentsAction` server action which
// transitions the case INTAKE → EXTRACTING and redirects back to the detail
// page. Fixtures-backed; no Supabase Storage yet.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCaseById, listDocumentsByCaseId } from "@/lib/data/cases";
import { UploadZone } from "./upload-zone";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const c = await getCaseById(caseId);
  if (!c) notFound();

  const existing = await listDocumentsByCaseId(caseId);

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
          <Link
            href={`/developer/${c.id}`}
            className="tnum text-[13px] font-medium hover:underline"
            style={{ color: "var(--ink-2)" }}
          >
            {c.id}
          </Link>
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>
            /
          </span>
          <span className="text-[13px]" style={{ color: "var(--ink)" }}>
            Upload
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--ink-3)" }}
        >
          Step 1 of 4 · Intake
        </p>
        <h1
          className="mt-1 text-[22px] font-semibold leading-tight tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Upload documents
        </h1>
        <p className="mt-2 max-w-prose text-[13px]" style={{ color: "var(--ink-3)" }}>
          Attach the AppFolio application, screening report, bank statements,
          paystubs, government ID, and any voucher docs for{" "}
          <span style={{ color: "var(--ink-2)" }}>{c.primaryApplicantName}</span>.
          Janus will classify each file and extract candidate facts in the next
          step.
        </p>

        <UploadZone caseId={c.id} existingCount={existing.length} />
      </main>
    </div>
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
