import Anthropic from "@anthropic-ai/sdk";

export interface ParsedQuestion {
  number: number;
  body: string;
  answer?: string;
  explanation?: string;
}

export interface PageContent {
  text: string;
  isAnswerPage: boolean;
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_PROMPT = `이 PDF는 수학 시험지입니다.
문제 페이지의 텍스트만 순서대로 추출하세요.
규칙:
- "정답", "해설", "정답보기" 텍스트가 등장하는 페이지 또는 섹션부터는 추출하지 마세요
- 마크다운 문법(#, **, --, ## 등) 절대 사용 금지
- 수식은 LaTeX 형식으로 $...$ 안에 작성 (예: $2x^2 + 3x - 1$)
- 분수는 \\frac{}{} 사용 (예: $\\frac{1}{2}$)
- 수식 내 인식이 불확실한 문자도 최대한 추측하여 LaTeX로 표현하세요. 절대로 §, □, ?, 빈칸 등 대체 문자를 사용하지 마세요.
- 인식 불가 기호는 반드시 \\square 로 표기하세요 (§ 사용 금지)
- 문제 번호, 선지(①②③④⑤), 조건 포함 (정답·해설·풀이는 제외)
- 각 문장/항목은 줄바꿈으로 구분
- 이미지나 그림은 [그림] 으로 표시
- 페이지 구분자(-- 1 of N --, 페이지 N 등) 출력 금지`;

const ANSWER_PROMPT = `이 이미지는 수학 시험지 정답/해설 페이지입니다.
각 문제의 번호, 답, 해설을 추출하세요.
규칙:
- 마크다운 문법(#, **, --, ## 등) 절대 사용 금지
- 수식은 LaTeX 형식으로 $...$ 안에 작성
- 수식 내 인식이 불확실한 문자도 최대한 추측하여 LaTeX로 표현하세요. 절대로 §, □, ?, 빈칸 등 대체 문자를 사용하지 마세요.
- 인식 불가 기호는 반드시 \\square 로 표기하세요 (§ 사용 금지)
- 반드시 아래 형식으로만 출력:
번호|답|해설
1|④|2X-B=A-5B에서 2X=A-4B, X=$\\frac{1}{2}$A-2B=...
2|③|다항식에서 차수가 가장 큰 항인 $2x^3$의 차수가 3이므로...
- 해설이 없으면 해설 칸 비워도 됨: 1|④|`;

function cleanMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/^--\s*\d+\s*of\s*\d+\s*--$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/§/g, "\\square")
    .trim();
}

function replaceBrokenChars(text: string): string {
  return text.replace(/§/g, "\\square");
}

// 추출된 문제 텍스트에서 정답/해설 섹션이 시작되는 위치부터 잘라냄
function removeAnswerSection(text: string): string {
  const idx = text.search(/\n(정답|해설|정답보기)/);
  return idx !== -1 ? text.slice(0, idx).trim() : text;
}

export function isAnswerPage(text: string): boolean {
  return /정답|해설|정답보기/.test(text.slice(0, 200));
}

async function callClaude(base64Pdf: string, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64Pdf,
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  return response.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

export async function extractFromPdf(buffer: Buffer): Promise<PageContent[]> {
  const base64Pdf = buffer.toString("base64");

  const [rawQuestion, rawAnswer] = await Promise.all([
    callClaude(base64Pdf, EXTRACTION_PROMPT),
    callClaude(base64Pdf, ANSWER_PROMPT),
  ]);

  return [
    { text: removeAnswerSection(cleanMarkdown(rawQuestion)), isAnswerPage: false },
    { text: replaceBrokenChars(rawAnswer), isAnswerPage: true },
  ];
}

export function parseQuestions(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const parts = text.split(/(?=^\d{1,2}[\s\t]+\S)/m);
  for (const part of parts) {
    const match = part.match(/^(\d{1,2})[\s\t]+([\s\S]+)/);
    if (match) {
      // match[2]가 답 기호(①②③④⑤)로 시작하면 정답 페이지 내용 — 건너뜀
      if (/^[①②③④⑤]/.test(match[2].trim())) continue;
      questions.push({
        number: parseInt(match[1]),
        body: match[0].trim(),
      });
    }
  }
  return questions;
}

export function parseAnswers(
  answerText: string
): Map<number, { answer: string; explanation: string }> {
  const map = new Map<number, { answer: string; explanation: string }>();
  for (const line of answerText.split("\n")) {
    const parts = line.split("|");
    if (parts.length >= 2) {
      const num = parseInt(parts[0].trim());
      if (!isNaN(num)) {
        map.set(num, {
          answer: parts[1]?.trim() ?? "",
          explanation: parts[2]?.trim() ?? "",
        });
      }
    }
  }
  return map;
}
