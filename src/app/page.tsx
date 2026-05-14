"use client";

import { useRef, useState } from "react";

type Status = "idle" | "converting" | "done" | "error";

interface ConvertResult {
  url: string;
  filename: string;
  pageCount: string;
  formulaCount: string;
}

const STATUS_LABEL: Record<Status, string> = {
  idle: "변환 시작",
  converting: "변환 중... (Claude Vision 수식 분석 포함)",
  done: "다시 변환",
  error: "다시 시도",
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("PDF 파일(.pdf)만 업로드 가능합니다");
      return;
    }
    setFile(f);
    setResult(null);
    setErrorMsg(null);
    setStatus("idle");
  }

  async function handleConvert() {
    if (!file) return;
    setStatus("converting");
    setErrorMsg(null);

    const body = new FormData();
    body.append("pdf", file);

    try {
      const res = await fetch("/api/convert", { method: "POST", body });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "서버 오류");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const filename = file.name.replace(/\.pdf$/i, ".hwpx");

      setResult({
        url,
        filename,
        pageCount: res.headers.get("X-Page-Count") ?? "?",
        formulaCount: res.headers.get("X-Formula-Count") ?? "0",
      });
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "변환에 실패했습니다");
      setStatus("error");
    }
  }

  const busy = status === "converting";

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            PDF → HWPX 변환기
          </h1>
          <p className="mt-2 text-slate-500">
            Claude Vision AI로 수식을 자동 인식합니다
          </p>
        </div>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="PDF 파일 업로드"
          className={[
            "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-colors",
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-white hover:border-slate-400",
          ].join(" ")}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) selectFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) selectFile(f);
              e.target.value = "";
            }}
          />

          <svg
            className="h-10 w-10 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>

          {file ? (
            <div className="text-center">
              <p className="font-medium text-slate-800">{file.name}</p>
              <p className="text-sm text-slate-400 mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-slate-600">파일을 끌어다 놓거나 클릭하여 선택</p>
              <p className="text-sm text-slate-400 mt-0.5">.pdf 파일만 지원</p>
            </div>
          )}
        </div>

        {/* Error */}
        {errorMsg && (
          <p className="mt-3 text-sm text-red-600 text-center">{errorMsg}</p>
        )}

        {/* Convert button */}
        <button
          type="button"
          disabled={!file || busy}
          onClick={handleConvert}
          className="mt-4 w-full rounded-xl py-3 px-6 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              {STATUS_LABEL.converting}
            </span>
          ) : (
            STATUS_LABEL[status]
          )}
        </button>

        {/* Result card */}
        {result && status === "done" && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="h-5 w-5 text-green-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold text-green-800">변환 완료</span>
            </div>
            <div className="flex gap-4 text-sm text-green-700 mb-4">
              <span>페이지 {result.pageCount}쪽</span>
              <span>수식 {result.formulaCount}개 인식</span>
            </div>
            <a
              href={result.url}
              download={result.filename}
              className="block text-center rounded-xl py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors text-sm"
            >
              {result.filename} 다운로드
            </a>
          </div>
        )}

        {/* API key notice */}
        <p className="mt-6 text-xs text-slate-400 text-center">
          수식 인식에는 ANTHROPIC_API_KEY 환경변수가 필요합니다
        </p>
      </div>
    </main>
  );
}
