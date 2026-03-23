"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Upload } from "lucide-react";
import { WorkshopProgress } from "@/components/WorkshopProgress";

type ApiError = { error?: string };

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>("");
  const [readingPdf, setReadingPdf] = useState(false);
  const [pdfText, setPdfText] = useState<string>("");
  const [pdfExtractionPromise, setPdfExtractionPromise] = useState<Promise<string> | null>(null);

  const [pastedText, setPastedText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canContinue = useMemo(() => {
    const hasPdf = Boolean(pdfFile);
    const hasEnoughText = pastedText.trim().length >= 50;
    return hasPdf || hasEnoughText;
  }, [pastedText, pdfFile]);

  async function extractPdfText(file: File): Promise<string> {
    // pdfjs is ESM; dynamic import avoids server-side bundling issues.
    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items || [])
        .map((item: any) => item?.str ?? "")
        .join(" ")
        .trim();
      fullText += pageText ? `${pageText}\n` : "";
    }

    return fullText.trim();
  }

  const handlePdfSelected = (file: File | null) => {
    setError("");
    if (!file) return;

    setPdfFile(file);
    setPdfFilename(file.name);
    setPdfText("");
    setReadingPdf(true);

    const p = extractPdfText(file)
      .then((txt) => {
        setPdfText(txt);
        return txt;
      })
      .catch(() => {
        setPdfText("");
        throw new Error("Failed to read the PDF text.");
      })
      .finally(() => setReadingPdf(false));

    setPdfExtractionPromise(p);
  };

  const handleContinue = async () => {
    if (generating) return;
    setError("");

    if (!title.trim()) {
      setError("Please enter a course title.");
      return;
    }

    const pasted = pastedText.trim();
    const needsPdf = Boolean(pdfFile);

    let syllabusTextToSend = "";
    setGenerating(true);
    try {
      if (needsPdf) {
        if (!pdfText && pdfExtractionPromise) {
          syllabusTextToSend = await pdfExtractionPromise;
        } else if (pdfText) {
          syllabusTextToSend = pdfText;
        } else if (pdfFile) {
          syllabusTextToSend = await extractPdfText(pdfFile);
        }
      } else {
        syllabusTextToSend = pasted;
      }

      if (!syllabusTextToSend || syllabusTextToSend.length < 50) {
        throw new Error("Your syllabus text could not be read. Please try another PDF or paste the text.");
      }

      const res = await fetch("/api/courses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), syllabusText: syllabusTextToSend }),
      });

      const data = (await res.json()) as ApiError & { ok?: boolean; courseId?: string };
      if (!res.ok || !data.ok || !data.courseId) {
        throw new Error(data.error || "Failed to create your course.");
      }

      router.push(`/courses/${data.courseId}/map`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto py-16 px-6">
        <h1 className="text-3xl font-bold text-gray-900">Create a new course</h1>
        <p className="text-gray-500 text-sm mb-4 mt-[0.25cm]">
          Give your course a name and upload your syllabus. We&apos;ll build the structure for you.
        </p>
        <WorkshopProgress currentStep={1} />

        <div className="mt-10 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="title">
              Course title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Psychology"
              className="w-full py-3 px-4 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Upload your syllabus</label>
            <div className="grid grid-cols-[1fr_24px_1fr] gap-6 items-start">
                {/* Option A: PDF upload */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handlePdfSelected(e.target.files?.[0] ?? null)}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="text-gray-400" size={24} />
                      {!pdfFilename ? (
                        <>
                          <p className="text-gray-700">Upload your syllabus PDF</p>
                          <span className="text-sm text-blue-600 underline decoration-from-font">
                            browse my downloads
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Check className="text-green-600" size={18} />
                            <p className="text-gray-700 text-sm">{pdfFilename}</p>
                          </div>
                          {readingPdf && <p className="text-sm text-gray-500">Reading PDF...</p>}
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Vertical divider */}
                <div className="relative h-full">
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 bg-white border border-gray-200 rounded-full w-10 h-10 flex items-center justify-center text-gray-500 text-sm font-medium">
                    or
                  </div>
                </div>

                {/* Option B: paste */}
                <div>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Or paste your syllabus text here..."
                    className="w-full min-h-[160px] rounded-xl border border-gray-200 px-4 py-3 resize-none text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!canContinue || generating}
            onClick={handleContinue}
            className={[
              "w-full rounded-xl py-4 text-base font-medium transition-colors",
              !canContinue || generating
                ? "bg-black text-white opacity-50 cursor-not-allowed"
                : "bg-black text-white hover:text-blue-500",
            ].join(" ")}
          >
            {generating ? "Creating your course..." : "Continue"}
          </button>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </main>
    </div>
  );
}
