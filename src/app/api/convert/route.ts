import { type NextRequest } from "next/server";
import { extractTextFromPdf } from "@/lib/pdf-extractor";
import { detectFormulas } from "@/lib/formula-detector";
import { buildHwpx } from "@/lib/hwpx-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow up to 60s for Claude Vision + PDF processing
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf");

    if (!(file instanceof File)) {
      return Response.json({ error: "PDF 파일이 필요합니다" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json(
        { error: "PDF 파일(.pdf)만 지원합니다" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const [{ text, pageCount }, formulas] = await Promise.all([
      extractTextFromPdf(buffer),
      detectFormulas(buffer),
    ]);

    const hwpxBuffer = await buildHwpx(text, formulas);

    const outputFilename = file.name.replace(/\.pdf$/i, ".hwpx");

    return new Response(new Uint8Array(hwpxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(outputFilename)}`,
        "X-Page-Count": String(pageCount),
        "X-Formula-Count": String(formulas.length),
      },
    });
  } catch (err) {
    console.error("[/api/convert]", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "변환 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
