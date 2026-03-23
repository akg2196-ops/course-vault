"use client";

import Link from "next/link";
import {
  BookOpen,
  FileText,
  Circle,
  BookMarked,
  Layers,
  Sparkles,
  Search,
} from "lucide-react";

export default function LandingPage() {
  const nodes = [
    { icon: BookOpen, label: "Course", example: "" },
    { icon: FileText, label: "Chapter", example: "" },
    { icon: Circle, label: "Topic", example: "" },
    { icon: BookMarked, label: "Concept", example: "" },
  ];

  return (
    <div className="font-sans text-white leading-relaxed">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-gray-900 font-medium text-lg">
            Course Vault
          </Link>
          <Link
            href="/courses/new/workshop"
            className="bg-gray-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:text-blue-500 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="pt-[192px] pb-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Turn any course into a study system.
          </h1>
          <p className="mt-[72px] text-3xl text-white max-w-2xl mx-auto">
            Course Vault converts your syllabus, textbooks, and notes into a structured, searchable hierarchy
            — and uses AI to fill the gaps.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/courses/new/workshop"
              className="bg-black text-white rounded-xl px-8 py-4 text-base font-medium hover:text-blue-500 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sm font-medium tracking-widest uppercase text-gray-300">
            How it works
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white">From raw material to mental model.</h2>
          <p className="mt-6 text-lg text-gray-200 max-w-2xl leading-relaxed">
            When you create a new course, you upload your syllabus, textbook, class notes, and any other material.
            Course Vault reads everything and organizes it into a four-level hierarchy. Where there are gaps — missing
            summaries, undefined vocabulary, unexplained examples — AI fills them in automatically. As you add more
            material, those placeholders get replaced with your actual content. The structure stays intact. The gaps
            just get smaller.
          </p>

          <div className="mt-[96px]">
            <div className="max-w-lg mx-auto flex flex-col items-center">
              <style>{`
                @keyframes fadeSlideIn {
                  from { opacity: 0; transform: translateY(16px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .coursevault-fadeSlideIn {
                  animation: fadeSlideIn 600ms ease-out forwards;
                }
              `}</style>

              {nodes.map((n, idx) => {
                const Icon = n.icon;
                return (
                  <div key={n.label} className="w-full flex flex-col items-center">
                    <div
                      className="w-full opacity-0 coursevault-fadeSlideIn"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      <div className="relative rounded-lg bg-white border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
                        <Icon className="text-blue-500" size={18} />
                        <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-gray-900">
                          {n.label}
                        </p>
                      </div>
                    </div>

                    {idx < nodes.length - 1 && (
                      <div
                        className="w-0 border-l-2 border-dashed border-gray-300 h-10 mt-2"
                        aria-hidden
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sm font-medium tracking-widest uppercase text-gray-300">Why Course Vault</p>
          <h2 className="mt-4 text-3xl font-bold text-white">
            Your brain doesn&apos;t store facts. It stores structures.
          </h2>

          <p className="mt-6 text-lg text-gray-200 leading-relaxed">
            Researchers studying memory and learning show that we&apos;re better at remembering when new ideas are
            encoded into an existing structure. Schema theory explains why: a framework helps your brain interpret
            incoming information instead of treating it as unrelated bits. Hierarchical organization also reduces
            cognitive load by letting you chunk related items together, which protects limited working memory. The result
            is stronger recall, because later retrieval cues activate the same structure again.
          </p>

          <p className="mt-6 text-lg text-gray-200 leading-relaxed">
            This is what separates Course Vault from tools like Quizlet or Anki. Flashcards give you the facts. Course
            Vault gives you the context. A flashcard for &quot;Structuralism&quot; is easy to forget because it lacks location.
            A concept node for &quot;Structuralism&quot; anchors that fact inside a map, so it becomes part of the mental model
            you already use to think. The hierarchy isn&apos;t a feature — it&apos;s how retention becomes reliable.
          </p>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <Layers className="text-blue-500" size={22} />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Hierarchical structure</h3>
              <p className="mt-2 text-gray-600">
                Every course organizes into chapters, topics, and concepts automatically from your uploaded material.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <Sparkles className="text-blue-500" size={22} />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">AI fills the gaps</h3>
              <p className="mt-2 text-gray-600">
                Missing summaries, vocabulary, and examples are generated by AI and replaced as you add real content.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <Search className="text-blue-500" size={22} />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Everything in context</h3>
              <p className="mt-2 text-gray-600">
                Find any concept and see exactly where it lives in your course. No fact exists without its framework.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white">Your courses deserve better than flashcards.</h2>
          <p className="mt-4 text-gray-400 text-lg">Build your first course map in minutes.</p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/courses/new/workshop"
              className="bg-white text-gray-900 rounded-xl px-8 py-4 text-base font-medium hover:text-blue-500 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
