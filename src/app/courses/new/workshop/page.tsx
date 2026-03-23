"use client";

import { useRouter } from "next/navigation";

export default function WorkshopPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-2xl mx-auto py-24 px-6">
        <p className="text-xs font-medium tracking-widest uppercase text-blue-500 mb-4">Workshop</p>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">Welcome to Workshop.</h1>
        <p className="text-gray-500 text-base leading-relaxed mb-10 max-w-lg">
          Here we&apos;ll guide you through a few steps to structure your course in our database. Through this
          process, we&apos;ll divide your course into chapters, topics, and concepts. Don&apos;t worry if you
          don&apos;t have all the information — you can always add more material later.
        </p>

        <div className="flex gap-4 mb-12 flex-wrap">
          <span className="text-xs px-3 py-1 rounded-full border bg-blue-50 text-blue-600 border-blue-200">
            1 · Upload syllabus
          </span>
          <span className="text-xs px-3 py-1 rounded-full border bg-gray-100 text-gray-500 border-gray-200">
            2 · Chapters
          </span>
          <span className="text-xs px-3 py-1 rounded-full border bg-gray-100 text-gray-500 border-gray-200">
            3 · Topics
          </span>
          <span className="text-xs px-3 py-1 rounded-full border bg-gray-100 text-gray-500 border-gray-200">
            4 · Concepts
          </span>
        </div>

        <button
          type="button"
          onClick={() => router.push("/courses/new")}
          className="w-full max-w-xs mx-auto block text-center bg-gray-900 text-white rounded-xl py-4 text-base font-medium hover:text-blue-500 transition-colors"
        >
          Start building →
        </button>
      </main>
    </div>
  );
}
