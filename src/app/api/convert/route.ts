import { type NextRequest } from "next/server";
import {
  extractFromPdf,
  parseQuestions,
  parseAnswers,
} from "@/lib/pdf-extractor";
import { buildHwpx } from "@/lib/hwpx-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Two parallel Claude Vision calls per request
export const maxDuration = 120;

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

    const allPages = await extractFromPdf(buffer);

    const questionPages = allPages.filter((p) => !p.isAnswerPage);
    const answerPages = allPages.filter((p) => p.isAnswerPage);

    const questionText = questionPages.map((p) => p.text).join("\n");
    const questions = parseQuestions(questionText);

    const answerText = answerPages.map((p) => p.text).join("\n");
    const answerMap = parseAnswers(answerText);

    for (const q of questions) {
      const matched = answerMap.get(q.number);
      if (matched) {
        q.answer = matched.answer;
        q.explanation = matched.explanation;
      }
    }

    const hwpxBuffer = await buildHwpx(questionText, questions);

    const outputFilename = file.name.replace(/\.pdf$/i, ".hwpx");

    return new Response(new Uint8Array(hwpxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(outputFilename)}`,
        "X-Page-Count": String(questionPages.length),
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
