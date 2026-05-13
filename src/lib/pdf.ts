// PDF text extraction. Server-only. We extract text rather than passing whole
// PDFs to Claude as document blocks because:
//   - Text tokens are ~10× cheaper than PDF document-block tokens
//   - Round-trip is faster (smaller payloads)
//   - For typical screening packets (text-layered PDFs from AppFolio /
//     TransUnion / banks) the text layer is high-quality
//
// Caller checks the returned text length and falls back to sending the PDF
// as a visual document block if the text layer is missing or unusable
// (image-only scans without OCR return very short text).

import "server-only";

import { PDFParse } from "pdf-parse";

export type PdfTextResult = {
  text: string;
  pages: number;
};

/**
 * Returns the text layer of a PDF. For scanned / image-only PDFs the result
 * may be empty or near-empty; callers should check `text.trim().length` and
 * fall back to passing the original PDF to Claude as a document block.
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return {
      text: result.text ?? "",
      pages: result.pages?.length ?? 0,
    };
  } catch {
    // Encrypted / corrupt / unsupported PDF. Return empty so the caller falls
    // back to visual document blocks.
    return { text: "", pages: 0 };
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // ignore cleanup failures
      }
    }
  }
}
