// DocumentClassifier — the contract that abstracts how a freshly-uploaded
// document is labeled (AppFolio app vs. screening report vs. bank statement
// vs. paystub vs. ID vs. voucher vs. unknown).
//
// MVP: HeuristicClassifier ships. It inspects filename + mime only — no OCR,
// no model call. Useful as a placeholder that's not completely useless: most
// operator-packet filenames carry enough signal to label correctly.
//
// v2 (Claude / Textract / hybrid) will implement the same interface and slot
// in without callers changing. The real impl will probably layer:
//   1. Textract OCR → extracted-text snippet
//   2. Claude classification of that snippet against the same DocumentClassification union
//   3. Fallback to filename heuristics on low confidence
// The decision engine and data model don't change.
//
// Caller responsibilities (out of scope for this file):
//   - Fetching the file bytes from storage (when real OCR lands).
//   - Persisting the ClassifyResult to the Document row.
//   - Triggering the next phase (fact extraction) once everything's labeled.
// Provider methods are pure transforms — I/O lives at the call sites.
//
// Why a separate provider seam (not a plain function): keeps the swap from
// HeuristicClassifier → ClaudeClassifier → HybridClassifier mechanical, and
// makes the classifier injectable for tests.

import type { DocumentClassification } from "@/lib/data/cases";

// ───────────────────────── Inputs ─────────────────────────

export type ClassifyInput = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  // Real classifiers will also accept a Storage URL or pre-extracted text;
  // the heuristic impl doesn't need them yet, so they stay off the interface
  // until a concrete impl actually consumes them.
};

// ───────────────────────── Outputs ─────────────────────────

export type ClassifyResult = {
  classification: DocumentClassification;
  /** 0..1. Below ~0.5 the operator should be nudged to verify. */
  confidence: number;
  /** Short human-readable explanation surfaced in the operator review UI. */
  rationale?: string;
};

// ───────────────────────── Interface ─────────────────────────

export interface DocumentClassifier {
  readonly name: string;
  classify(input: ClassifyInput): Promise<ClassifyResult>;
}

// ───────────────────────── HeuristicClassifier ─────────────────────────

/**
 * Filename + mime heuristic. Fast, deterministic, no external dependencies.
 * Returns UNKNOWN (confidence 0) when nothing matches — the operator review
 * UI is expected to surface UNKNOWN distinctly so it can be hand-labeled.
 */
export class HeuristicClassifier implements DocumentClassifier {
  readonly name = "heuristic_v1";

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    const f = input.filename.toLowerCase();
    const t = (input.mimeType || "").toLowerCase();

    // Order matters — more specific patterns first. A file named
    // "appfolio_screening_report.pdf" should be SCREENING_REPORT, not
    // APPFOLIO_APPLICATION.
    const rules: Array<{
      pattern: RegExp;
      classification: DocumentClassification;
      rationale: string;
    }> = [
      {
        pattern: /smartmove|transunion|\bcra\b|screening|tu[_\s-]?report/,
        classification: "SMARTMOVE_REPORT",
        rationale: "filename mentions screening provider / TU report",
      },
      {
        pattern: /voucher|section[_\s-]?8|\bhcv\b|housing[_\s-]?choice/,
        classification: "SECTION8_VOUCHER",
        rationale: "filename mentions voucher / Section 8 / HCV",
      },
      {
        pattern: /paystub|pay[_\s-]?stub|earnings|payroll/,
        classification: "PAYSTUB",
        rationale: "filename mentions paystub / earnings / payroll",
      },
      {
        pattern: /bank[_\s-]?statement|statement.*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})|chase|wells|boa|citi|capital[_\s-]?one|usbank|ally/,
        classification: "BANK_STATEMENT",
        rationale: "filename matches bank-statement patterns",
      },
      {
        pattern: /appfolio|application(_|\s|-)?packet|rental[_\s-]?application|\bapp(_|\s)?/,
        classification: "APPFOLIO_APPLICATION",
        rationale: "filename mentions AppFolio / application packet",
      },
      {
        pattern: /license|state[_\s-]?id|passport|government[_\s-]?id|drivers?[_\s-]?(license|lic)|\bid\b/,
        classification: "ID",
        rationale: "filename mentions an ID type",
      },
    ];

    for (const r of rules) {
      if (r.pattern.test(f)) {
        // PDFs get a small bump — the filename signal is stronger when the
        // file is clearly a document and not an arbitrary screenshot.
        const base = t === "application/pdf" ? 0.7 : t.startsWith("image/") ? 0.6 : 0.5;
        return { classification: r.classification, confidence: base, rationale: r.rationale };
      }
    }

    // Images with no filename signal are almost always ID photos from a phone.
    // Low confidence — operator should verify.
    if (t.startsWith("image/")) {
      return {
        classification: "ID",
        confidence: 0.35,
        rationale: "image with no filename signal — likely a phone-captured ID",
      };
    }

    return {
      classification: "UNKNOWN",
      confidence: 0,
      rationale: "no filename heuristic matched",
    };
  }
}

// Default singleton — most callers don't need to choose. Tests should
// instantiate their own (no shared mutable state, but easier to swap).
export const defaultClassifier: DocumentClassifier = new HeuristicClassifier();
