// Service-role Supabase client. Server-only — NEVER import from a client
// component. The service role key bypasses RLS, so this is used for trusted
// server actions (upload writes, etc.) until we have proper RLS policies.
//
// When Supabase Auth lands, prefer the anon-key + session-scoped client for
// any read the operator could do directly; reserve service role for writes
// that need to bypass tenant RLS.

import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_ROLE_KEY) {
  // Defer the error to first call rather than crashing import — test runs
  // (vitest) shouldn't fail to import because env is missing.
}

let cached: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (!URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase env not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
    );
  }
  if (!cached) {
    cached = createClient(URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

// ─── Storage helpers ────────────────────────────────────────────────────────

export const CASE_DOCS_BUCKET = "case-documents";

/**
 * Ensures the case-documents bucket exists. Idempotent — safe to call on every
 * upload. Bucket is private by default; we serve through signed URLs.
 */
export async function ensureCaseDocsBucket(): Promise<void> {
  const supabase = getServiceSupabase();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Failed to list buckets: ${error.message}`);
  if (buckets.some((b) => b.name === CASE_DOCS_BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(
    CASE_DOCS_BUCKET,
    { public: false }
  );
  if (createError) {
    // Race with another invocation creating it — treat "already exists" as ok.
    if (!/already exists/i.test(createError.message)) {
      throw new Error(`Failed to create bucket: ${createError.message}`);
    }
  }
}

/**
 * Sanitizes a filename so it's safe to use inside a Storage path. Strips path
 * separators and unusual characters, collapses whitespace, removes leading
 * dots (hidden files), and caps length. Extension preserved if present.
 */
export function sanitizeFilename(name: string): string {
  const base = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-");
  const trimmed = base.replace(/^[.\-]+/, "").replace(/-+/g, "-").slice(0, 100);
  return trimmed || "file";
}

export function buildStoragePath(caseId: string, filename: string): string {
  const safe = sanitizeFilename(filename);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${caseId}/${stamp}-${rand}-${safe}`;
}

export async function uploadCaseDocument(
  storagePath: string,
  file: File
): Promise<void> {
  const supabase = getServiceSupabase();
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(CASE_DOCS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw new Error(`Storage upload failed for ${file.name}: ${error.message}`);
}

/**
 * Downloads a private document's bytes via the service-role client. Used by
 * the extractor to run PDF text extraction server-side before sending to
 * Claude (cheaper than passing whole PDFs as document blocks).
 */
export async function downloadCaseDocument(storagePath: string): Promise<Buffer> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage
    .from(CASE_DOCS_BUCKET)
    .download(storagePath);
  if (error || !data) {
    throw new Error(`Failed to download ${storagePath}: ${error?.message ?? "unknown"}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Generates a time-limited signed URL for a private document. Used to pass
 * PDFs to Claude (URL document blocks) without making the bucket public.
 * Default TTL is 10 minutes, plenty for the synchronous extractor call.
 */
export async function getSignedUrl(
  storagePath: string,
  expirySecs = 600
): Promise<string> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage
    .from(CASE_DOCS_BUCKET)
    .createSignedUrl(storagePath, expirySecs);
  if (error || !data) {
    throw new Error(`Failed to create signed URL for ${storagePath}: ${error?.message}`);
  }
  return data.signedUrl;
}
