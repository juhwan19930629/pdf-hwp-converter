import Anthropic from "@anthropic-ai/sdk";

export interface Formula {
  latex: string;
  description: string;
  context: string;
}

const PROMPT = `이 PDF에서 수학 수식, 방정식, 수학적 표현을 모두 추출해주세요.
발견된 각 수식에 대해 다음 JSON 형식으로 반환하세요:
{
  "formulas": [
    {
      "latex": "LaTeX 표현식",
      "description": "수식이 나타내는 것에 대한 간단한 설명 (한국어)",
      "context": "주변 텍스트 맥락 (최대 50자)"
    }
  ]
}
수식이 없으면 빈 배열을 반환하세요: {"formulas": []}
반드시 JSON만 반환하고 다른 텍스트는 없어야 합니다.`;

export async function detectFormulas(pdfBuffer: Buffer): Promise<Formula[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — skipping formula detection");
    return [];
  }

  const client = new Anthropic({ apiKey });
  const base64Pdf = pdfBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
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
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: PROMPT,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") return [];

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as { formulas?: Formula[] };
    return parsed.formulas ?? [];
  } catch {
    console.error("Formula detection parse error:", content.text.slice(0, 200));
    return [];
  }
}
