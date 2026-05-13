"use client";

// Drag/drop multi-file zone. Holds staged files in component state, validates
// client-side (size + mime), constructs FormData, and calls the server action.
// The server re-validates defensively — never trust the client.

import { useRef, useState, useTransition } from "react";
import { uploadDocumentsAction } from "../../actions";

const ACCEPT = "application/pdf,image/*";
const MAX_FILES = 25;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_PREFIXES = ["application/pdf", "image/"] as const;

type Staged = { file: File; error?: string };

function validate(file: File): string | undefined {
  if (file.size > MAX_FILE_BYTES) return "Exceeds 20MB";
  const t = file.type || "";
  if (!ALLOWED_PREFIXES.some((p) => t.startsWith(p))) return "Unsupported type";
  return undefined;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadZone({
  caseId,
  existingCount,
}: {
  caseId: string;
  existingCount: number;
}) {
  const [files, setFiles] = useState<Staged[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function add(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    const next = [...files];
    for (const f of arr) {
      if (next.length >= MAX_FILES) break;
      // Dedupe by name+size — best-effort, no real content hash here.
      if (next.some((s) => s.file.name === f.name && s.file.size === f.size)) continue;
      next.push({ file: f, error: validate(f) });
    }
    setFiles(next);
  }

  function remove(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function clear() {
    setFiles([]);
    setServerError(null);
  }

  function onSubmit() {
    setServerError(null);
    const valid = files.filter((s) => !s.error).map((s) => s.file);
    if (valid.length === 0) return;
    const fd = new FormData();
    fd.set("caseId", caseId);
    for (const f of valid) fd.append("files", f);
    startTransition(async () => {
      try {
        await uploadDocumentsAction(fd);
      } catch (err) {
        // `redirect()` throws NEXT_REDIRECT — let it bubble so the framework
        // can navigate. Anything else is a real error.
        if (err && typeof err === "object" && "digest" in err) throw err;
        setServerError(err instanceof Error ? err.message : "Upload failed.");
      }
    });
  }

  const validFiles = files.filter((s) => !s.error);
  const hasErrors = files.some((s) => s.error);
  const totalBytes = validFiles.reduce((acc, s) => acc + s.file.size, 0);
  const canSubmit = validFiles.length > 0 && !pending;

  return (
    <div className="mt-6 space-y-4">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className="cursor-pointer rounded-[12px] p-8 text-center transition-colors"
        style={{
          border: `1px dashed ${dragOver ? "var(--primary)" : "var(--hairline-strong)"}`,
          background: dragOver ? "var(--primary-soft)" : "var(--surface-2)",
        }}
      >
        <div
          className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-[8px]"
          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
        >
          <IconUpload />
        </div>
        <p className="mt-3 text-[14px] font-medium" style={{ color: "var(--ink)" }}>
          Drop files here or{" "}
          <span style={{ color: "var(--primary)" }}>click to browse</span>
        </p>
        <p className="mt-1 text-[12px]" style={{ color: "var(--ink-3)" }}>
          PDF or image · up to 20MB each · max {MAX_FILES} files per upload
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            // Reset value so picking the same file twice re-fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <div
          className="overflow-hidden rounded-[12px]"
          style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--hairline)" }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-3)" }}
            >
              Staged · <span className="tnum">{files.length}</span>
              {hasErrors && (
                <>
                  {" · "}
                  <span style={{ color: "var(--bad)" }}>
                    <span className="tnum">{files.length - validFiles.length}</span> blocked
                  </span>
                </>
              )}
            </span>
            <div className="flex items-center gap-3">
              <span className="tnum text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                {fmtBytes(totalBytes)}
              </span>
              <button
                type="button"
                onClick={clear}
                className="text-[11px] font-semibold uppercase tracking-[0.08em] hover:underline"
                style={{ color: "var(--ink-3)" }}
              >
                Clear all
              </button>
            </div>
          </div>
          <ul>
            {files.map((s, i) => (
              <li
                key={`${s.file.name}-${s.file.size}-${i}`}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--hairline-soft)",
                  opacity: s.error ? 0.85 : 1,
                }}
              >
                <FileGlyph mime={s.file.type} blocked={Boolean(s.error)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]" style={{ color: "var(--ink)" }}>
                    {s.file.name}
                  </div>
                  <div
                    className="tnum text-[11.5px]"
                    style={{ color: s.error ? "var(--bad)" : "var(--ink-3)" }}
                  >
                    {fmtBytes(s.file.size)} · {s.file.type || "unknown type"}
                    {s.error ? <> · {s.error}</> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] hover:underline"
                  style={{ color: "var(--ink-3)" }}
                  aria-label={`Remove ${s.file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {serverError && (
        <div
          className="rounded-[10px] px-4 py-3 text-[12.5px]"
          style={{
            background: "var(--bad-tint)",
            color: "var(--bad)",
            border: "1px solid var(--bad-soft)",
          }}
          role="alert"
        >
          {serverError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px]" style={{ color: "var(--ink-3)" }}>
          {existingCount === 0
            ? "No documents on file yet."
            : `${existingCount} document${existingCount === 1 ? "" : "s"} already on file. New files append.`}
        </p>
        <div className="flex items-center gap-3">
          <a
            href={`/developer/${caseId}`}
            className="text-[13px]"
            style={{ color: "var(--ink-3)" }}
          >
            Cancel
          </a>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2.5 text-[14px] font-medium"
            style={{
              background: canSubmit ? "var(--primary)" : "var(--ink-4)",
              color: "var(--on-primary)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.55,
            }}
          >
            {pending ? (
              <>
                <Spinner /> Uploading…
              </>
            ) : (
              <>
                Upload <span className="tnum">{validFiles.length}</span> file
                {validFiles.length === 1 ? "" : "s"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileGlyph({ mime, blocked }: { mime: string; blocked: boolean }) {
  const isPdf = mime === "application/pdf";
  const isImage = mime.startsWith("image/");
  const label = isPdf ? "PDF" : isImage ? "IMG" : "···";
  const bg = blocked ? "var(--bad-soft)" : "var(--surface-2)";
  const fg = blocked ? "var(--bad)" : "var(--ink-3)";
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-[10px] font-semibold tracking-wide"
      style={{ background: bg, color: fg }}
      aria-hidden
    >
      {label}
    </span>
  );
}

function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "janus-spin 700ms linear infinite" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
