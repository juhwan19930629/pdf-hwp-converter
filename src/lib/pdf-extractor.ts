import { PDFParse } from "pdf-parse";

export interface PdfContent {
  text: string;
  pageCount: number;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<PdfContent> {
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
    verbosity: 0, // suppress pdfjs-dist console output
  });

  const result = await parser.getText();
  await parser.destroy();

  return {
    text: result.text,
    pageCount: result.total,
  };
}
