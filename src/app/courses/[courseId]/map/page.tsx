"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BookMarked, CheckCircle, ChevronDown, ChevronRight, Circle, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { WorkshopProgress } from "@/components/WorkshopProgress";

type Chapter = {
  id?: string;
  title: string;
  order: number;
};

type GeneratedTopics = {
  chapters: Array<{
    chapterId: string;
    title?: string;
    topics: Array<{
      title: string;
      order: number;
    }>;
  }>;
};

type GeneratedConcepts = {
  topics: Array<{
    topicId: string;
    concepts: Array<{ title: string; order: number }>;
  }>;
};

type Course = {
  id: string;
  title: string;
  chapters?: Array<{
    id: string;
    title: string;
    order: number;
  }>;
};

function getOrderSortedChapters(course: Course | null): Chapter[] {
  return (
    (course?.chapters ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, title: c.title, order: c.order })) ?? []
  );
}

export default function MapPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string | undefined;

  const [courseTitleSaving, setCourseTitleSaving] = useState(false);
  const [courseTitleError, setCourseTitleError] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [stage, setStage] = useState<"loading" | "analyzing" | "review" | "success">("loading");
  const [initialError, setInitialError] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopics | null>(null);
  const [topicsApproved, setTopicsApproved] = useState(false);
  const [topicFeedback, setTopicFeedback] = useState("");
  const [isApprovingTopics, setIsApprovingTopics] = useState(false);
  const [isRegeneratingTopics, setIsRegeneratingTopics] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTopicKey, setEditingTopicKey] = useState<string | null>(null);

  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcepts | null>(null);
  const [conceptsApproved, setConceptsApproved] = useState(false);
  const [conceptFeedback, setConceptFeedback] = useState("");
  const [isApprovingConcepts, setIsApprovingConcepts] = useState(false);
  const [isRegeneratingConcepts, setIsRegeneratingConcepts] = useState(false);
  const [topicTitlesByTopicId, setTopicTitlesByTopicId] = useState<Record<string, string>>({});
  const [editingConceptKey, setEditingConceptKey] = useState<string | null>(null);
  const [conceptError, setConceptError] = useState<string | null>(null);

  const approvalPayload = useMemo(
    () => ({
      chapters: chapters.map((c) => ({ title: c.title, order: c.order })),
    }),
    [chapters]
  );

  const chapterIdsKey = useMemo(
    () => (generatedTopics?.chapters ?? []).map((ch) => ch.chapterId).join("|"),
    [generatedTopics]
  );

  const workshopCurrentStep = useMemo((): 1 | 2 | 3 | 4 => {
    if (stage === "loading" || stage === "analyzing" || stage === "review") return 2;
    if (stage === "success") {
      if (topicsApproved) return 4;
      return 3;
    }
    return 2;
  }, [stage, topicsApproved]);

  const stageSubheading = useMemo(() => {
    if (stage === "loading") return "Loading your course...";
    if (stage === "analyzing") return "Analyzing your syllabus...";
    if (workshopCurrentStep === 2) return "We've analyzed your syllabus and generated the chapters below. Review them and let us know if anything needs to change before we move on to topics.";
    if (workshopCurrentStep === 3) {
      if (!generatedTopics) return "Your chapters are set. Generate topics to continue.";
      return "Here are the topics we've generated for each chapter. Review them and let us know if anything needs to change.";
    }
    if (workshopCurrentStep === 4) {
      if (!generatedConcepts && !conceptsApproved) return "Your topics are set. Generate concepts to complete your course structure.";
      return "Here are the concepts we've generated for each topic. These are the smallest units of knowledge in your course.";
    }
    return "";
  }, [stage, workshopCurrentStep, generatedTopics, generatedConcepts, conceptsApproved]);

  useEffect(() => {
    if (!generatedTopics) return;
    setExpandedChapters(new Set(generatedTopics.chapters.map((ch) => ch.chapterId)));
  }, [chapterIdsKey, generatedTopics]);

  useEffect(() => {
    if (!conceptsApproved || !courseId) return;
    const t = setTimeout(() => router.push(`/courses/${courseId}`), 3000);
    return () => clearTimeout(t);
  }, [conceptsApproved, courseId, router]);

  const hydrateGeneratedTopics = (data: GeneratedTopics): GeneratedTopics => {
    const chapterTitleById = new Map(chapters.map((chapter) => [chapter.id, chapter.title]));
    return {
      chapters: data.chapters.map((chapter) => ({
        ...chapter,
        title: chapter.title ?? chapterTitleById.get(chapter.chapterId) ?? "New Chapter",
      })),
    };
  };

  useEffect(() => {
    if (!courseId) return;

    let cancelled = false;

    const load = async () => {
      setCourseTitleError(null);
      setInitialError(null);
      setRegenError(null);
      setApproveError(null);
      setTopicError(null);
      setStage("loading");

      try {
        const res = await fetch(`/api/courses/${courseId}`);
        const data = (await res.json()) as Course & { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to fetch course");
        if (!data?.id) throw new Error("Course not found");

        if (cancelled) return;

        const title = data.title ?? "";
        setCourseTitle(title);

        const existing = getOrderSortedChapters(data).filter((c) => c.title !== title);
        setChapters(existing);

        if (existing.length > 0) {
          setGeneratedTopics(null);
          setTopicsApproved(false);
          setTopicFeedback("");
          setGeneratedConcepts(null);
          setConceptsApproved(false);
          setConceptFeedback("");
          setStage("success");
          return;
        }

        setStage("analyzing");
        setIsRegenerating(true);

        const genRes = await fetch(`/api/courses/${courseId}/generate-chapters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: "" }),
        });
        const genData = (await genRes.json()) as { ok?: boolean; chapters?: Chapter[]; error?: string };
        if (!genRes.ok || !genData?.ok) {
          throw new Error(genData?.error || "Failed to generate chapters");
        }

        if (cancelled) return;
        const nextChapters = genData.chapters?.map((c) => ({ title: c.title, order: c.order })) ?? [];
        const filteredNext = nextChapters.filter((c) => c.title !== title);
        filteredNext.sort((a, b) => a.order - b.order);
        setChapters(filteredNext);
        setStage("review");
      } catch (e) {
        if (cancelled) return;
        setInitialError(e instanceof Error ? e.message : "Something went wrong.");
        setStage("loading");
      } finally {
        if (cancelled) return;
        setIsRegenerating(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const handleCourseTitleBlur = async () => {
    if (!courseId) return;
    setCourseTitleError(null);
    setCourseTitleSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: courseTitle }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save course title");
    } catch (e) {
      setCourseTitleError(e instanceof Error ? e.message : "Failed to save course title");
    } finally {
      setCourseTitleSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!courseId) return;
    setRegenError(null);
    setInitialError(null);
    setApproveError(null);

    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/generate-chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      const data = (await res.json()) as { ok?: boolean; chapters?: Chapter[]; error?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to regenerate chapters");

      const next = data.chapters?.map((c) => ({ id: c.id, title: c.title, order: c.order })) ?? [];
      const filtered = next.filter((c) => c.title !== courseTitle);
      filtered.sort((a, b) => a.order - b.order);
      setChapters(filtered);
      setFeedback("");
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!courseId) return;
    setApproveError(null);
    setRegenError(null);

    setIsApproving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/approve-chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalPayload),
      });
      const data = (await res.json()) as { ok?: boolean; chapters?: Chapter[]; error?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to save chapters");

      const saved = data.chapters?.map((c) => ({ id: c.id, title: c.title, order: c.order })) ?? [];
      saved.sort((a, b) => a.order - b.order);
      setChapters(saved);
      setGeneratedTopics(null);
      setTopicsApproved(false);
      setTopicFeedback("");
      setTopicError(null);
      setStage("success");
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleGenerateTopics = async () => {
    if (!courseId) return;
    setTopicError(null);
    setIsGeneratingTopics(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/generate-topics`, {
        method: "POST",
      });
      const data = (await res.json()) as GeneratedTopics & { error?: string };
      if (!res.ok || !data?.chapters) throw new Error(data?.error || "Failed to generate topics");
      setGeneratedTopics(hydrateGeneratedTopics(data));
      setTopicsApproved(false);
    } catch (e) {
      setTopicError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const handleRegenerateTopics = async () => {
    if (!courseId) return;
    setTopicError(null);
    setIsRegeneratingTopics(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/generate-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: topicFeedback }),
      });
      const data = (await res.json()) as GeneratedTopics & { error?: string };
      if (!res.ok || !data?.chapters) throw new Error(data?.error || "Failed to regenerate topics");
      setGeneratedTopics(hydrateGeneratedTopics(data));
      setTopicFeedback("");
      setTopicsApproved(false);
    } catch (e) {
      setTopicError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsRegeneratingTopics(false);
    }
  };

  const handleApproveTopics = async () => {
    if (!courseId || !generatedTopics) return;
    setTopicError(null);
    setIsApprovingTopics(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/approve-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters: generatedTopics.chapters }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to approve topics");
      setTopicsApproved(true);
    } catch (e) {
      setTopicError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsApprovingTopics(false);
    }
  };

  const handleGenerateConcepts = async () => {
    if (!courseId) return;
    setConceptError(null);
    setIsGeneratingConcepts(true);
    try {
      const [conceptsRes, courseRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/generate-concepts`, { method: "POST" }),
        fetch(`/api/courses/${courseId}`),
      ]);
      const conceptsData = (await conceptsRes.json()) as GeneratedConcepts & { ok?: boolean; error?: string };
      if (!conceptsRes.ok || !conceptsData.topics) {
        throw new Error(conceptsData.error || "Failed to generate concepts");
      }
      const courseData = (await courseRes.json()) as { chapters?: Array<{ topics?: Array<{ id: string; title: string }> }> };
      const titles: Record<string, string> = {};
      for (const ch of courseData.chapters ?? []) {
        for (const t of ch.topics ?? []) {
          titles[t.id] = t.title ?? "";
        }
      }
      setTopicTitlesByTopicId(titles);
      setGeneratedConcepts({ topics: conceptsData.topics });
    } catch (e) {
      setConceptError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleRegenerateConcepts = async () => {
    if (!courseId) return;
    setConceptError(null);
    setIsRegeneratingConcepts(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/generate-concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: conceptFeedback }),
      });
      const data = (await res.json()) as GeneratedConcepts & { ok?: boolean; error?: string };
      if (!res.ok || !data.topics) throw new Error(data.error || "Failed to regenerate concepts");
      setGeneratedConcepts({ topics: data.topics });
      setConceptFeedback("");
    } catch (e) {
      setConceptError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsRegeneratingConcepts(false);
    }
  };

  const handleApproveConcepts = async () => {
    if (!courseId || !generatedConcepts) return;
    setConceptError(null);
    setIsApprovingConcepts(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/approve-concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: generatedConcepts.topics }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to approve concepts");
      setConceptsApproved(true);
    } catch (e) {
      setConceptError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsApprovingConcepts(false);
    }
  };

  const updateConceptTitle = (topicId: string, conceptOrder: number, title: string) => {
    setGeneratedConcepts((prev) => {
      if (!prev) return prev;
      return {
        topics: prev.topics.map((t) =>
          t.topicId === topicId
            ? {
                ...t,
                concepts: t.concepts.map((c) =>
                  c.order === conceptOrder ? { ...c, title } : c
                ),
              }
            : t
        ),
      };
    });
  };

  const removeConcept = (topicId: string, conceptOrder: number) => {
    setGeneratedConcepts((prev) => {
      if (!prev) return prev;
      return {
        topics: prev.topics.map((t) => {
          if (t.topicId !== topicId) return t;
          const remaining = t.concepts
            .filter((c) => c.order !== conceptOrder)
            .sort((a, b) => a.order - b.order)
            .map((c, i) => ({ ...c, order: i }));
          return { ...t, concepts: remaining };
        }),
      };
    });
    if (editingConceptKey === `${topicId}-${conceptOrder}`) {
      setEditingConceptKey(null);
    }
  };

  const toggleChapterExpanded = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const updateChapterTitle = (chapterId: string, title: string) => {
    setGeneratedTopics((prev) => {
      if (!prev) return prev;
      return {
        chapters: prev.chapters.map((chapter) =>
          chapter.chapterId === chapterId ? { ...chapter, title } : chapter
        ),
      };
    });
  };

  const updateTopicTitle = (chapterId: string, topicOrder: number, title: string) => {
    setGeneratedTopics((prev) => {
      if (!prev) return prev;
      return {
        chapters: prev.chapters.map((chapter) => {
          if (chapter.chapterId !== chapterId) return chapter;
          return {
            ...chapter,
            topics: chapter.topics.map((topic) =>
              topic.order === topicOrder ? { ...topic, title } : topic
            ),
          };
        }),
      };
    });
  };

  const addChapterForReview = () => {
    const newOrder = chapters.length > 0 ? Math.max(...chapters.map((c) => c.order)) + 1 : 0;
    setChapters((prev) => [...prev, { title: "New Chapter", order: newOrder }]);
  };

  const addChapter = () => {
    const newChapterId = `new-chapter-${Date.now()}`;
    setGeneratedTopics((prev) => {
      if (!prev) return prev;
      return {
        chapters: [
          ...prev.chapters,
          {
            chapterId: newChapterId,
            title: "New Chapter",
            topics: [],
          },
        ],
      };
    });
    setExpandedChapters((prev) => new Set(prev).add(newChapterId));
    setEditingChapterId(newChapterId);
  };

  const removeChapter = (chapterId: string) => {
    setGeneratedTopics((prev) => {
      if (!prev) return prev;
      return {
        chapters: prev.chapters.filter((chapter) => chapter.chapterId !== chapterId),
      };
    });
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      next.delete(chapterId);
      return next;
    });
    if (editingChapterId === chapterId) {
      setEditingChapterId(null);
    }
  };

  const addTopic = (chapterId: string) => {
    const newOrder =
      (generatedTopics?.chapters
        .find((chapter) => chapter.chapterId === chapterId)
        ?.topics.reduce((maxOrder, topic) => Math.max(maxOrder, topic.order), -1) ?? -1) + 1;
    const topicKey = `${chapterId}-${newOrder}`;
    setGeneratedTopics((prev) => {
      if (!prev) return prev;
      return {
        chapters: prev.chapters.map((chapter) => {
          if (chapter.chapterId !== chapterId) return chapter;
          return {
            ...chapter,
            topics: [...chapter.topics, { title: "New Topic", order: newOrder }],
          };
        }),
      };
    });
    setEditingTopicKey(topicKey);
  };

  const removeTopic = (chapterId: string, topicOrder: number) => {
    setGeneratedTopics((prev) => {
      if (!prev) return prev;
      return {
        chapters: prev.chapters.map((chapter) => {
          if (chapter.chapterId !== chapterId) return chapter;
          const remaining = chapter.topics
            .filter((topic) => topic.order !== topicOrder)
            .sort((a, b) => a.order - b.order)
            .map((topic, index) => ({ ...topic, order: index }));
          return {
            ...chapter,
            topics: remaining,
          };
        }),
      };
    });
    if (editingTopicKey === `${chapterId}-${topicOrder}`) {
      setEditingTopicKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="w-full border-b border-gray-200 px-8 py-4 flex items-center justify-between bg-white">
        <div className="text-xl font-bold text-gray-900">Course Builder</div>
        <div className="text-gray-500 text-sm truncate max-w-[60%] text-right">{courseTitle || " "}</div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {conceptsApproved ? (
          <div className="flex flex-col items-center text-center py-24">
            <CheckCircle className="text-green-500" size={64} />
            <h1 className="text-2xl font-bold text-gray-900 mt-6">Your course is ready.</h1>
            <p className="text-gray-500 text-base max-w-md mx-auto text-center mt-3">
              You&apos;ve given us everything we need to build your course. You&apos;ll be able to edit and add more
              material at any time.
            </p>
            <Link
              href={courseId ? `/courses/${courseId}` : "/courses"}
              className="text-blue-500 text-sm mt-6 hover:underline"
            >
              Go to your course →
            </Link>
          </div>
        ) : (
          <>
            {courseTitle ? (
              <div>
                <input
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  onBlur={handleCourseTitleBlur}
                  disabled={courseTitleSaving || stage === "analyzing"}
                  className="block w-full bg-transparent text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-black/10 rounded-xl px-0"
                  aria-label="Course title"
                />
                {courseTitleError ? (
                  <p className="text-red-500 text-sm mt-2" role="alert">
                    {courseTitleError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <p
              className={`text-gray-500 text-sm mb-4 ${stage === "review" || stage === "success" ? "mt-[0.25cm]" : ""}`}
            >
              {stageSubheading}
            </p>
            <WorkshopProgress currentStep={workshopCurrentStep} />
            <div className="mt-10">

        {stage === "loading" && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        )}

        {stage === "analyzing" && (
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <Loader2 className="text-gray-700 animate-spin" size={24} />
            <div className="mt-3 text-gray-700 font-medium">Analyzing your syllabus...</div>
            {initialError && <p className="text-red-500 text-sm mt-4">{initialError}</p>}
          </div>
        )}

        {stage === "review" && (
          <div>
            {chapters.length > 0 ? (
              <div>
                <div className="text-sm font-medium tracking-widest uppercase text-gray-400 mb-1">
                  Step 1 — Chapters
                </div>
                <div>
                  {chapters.map((ch, idx) => (
                    <div
                      key={`${ch.id ?? ch.order}-${idx}`}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm mb-2"
                    >
                      <div className="flex items-center gap-3 w-full min-w-0">
                        <FileText className="h-4 w-4 text-notion-accent shrink-0" />
                        <input
                          value={ch.title}
                          onChange={(e) => {
                            const nextTitle = e.target.value;
                            setChapters((prev) =>
                              prev.map((c) => (c.order === ch.order ? { ...c, title: nextTitle } : c))
                            );
                          }}
                          className="flex-1 min-w-0 whitespace-nowrap font-medium text-gray-900 bg-transparent outline-none focus:ring-2 focus:ring-black/10 rounded"
                          aria-label={`Chapter ${idx + 1} title`}
                        />
                        <div className="ml-auto shrink-0 text-gray-400 text-sm">{idx + 1}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {isRegenerating ? <p className="mt-3 text-sm text-gray-400">Regenerating chapters...</p> : null}
                <button
                  type="button"
                  onClick={addChapterForReview}
                  className="text-sm text-gray-400 hover:text-gray-600 mt-4 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add chapter
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isRegenerating || isApproving}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApproving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : null}
                  Looks good →
                </button>
              </div>
            ) : (
              <div>
                <div className="text-gray-500 text-sm">No chapters yet.</div>
                <button
                  type="button"
                  onClick={addChapterForReview}
                  className="text-sm text-gray-400 hover:text-gray-600 mt-4 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add chapter
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isRegenerating || isApproving}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApproving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : null}
                  Looks good →
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "review" && chapters.length > 0 ? (
          <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
            <label className="mb-2 block text-sm font-medium text-gray-700">Not quite right?</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what to change — e.g. 'My course meets twice a week, organize by week' or 'Split chapter 3 into two separate chapters'"
              className="min-h-[80px] w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder:text-xs text-gray-900"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating || isApproving}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Regenerate
              </button>
            </div>
            {(regenError || approveError) && (
              <div className="mt-2">
                {regenError ? <p className="text-sm text-red-500">{regenError}</p> : null}
                {approveError ? <p className="text-sm text-red-500">{approveError}</p> : null}
              </div>
            )}
          </div>
        ) : null}

        {stage === "success" && (
          <div>
            <div className="flex flex-col gap-4 items-center text-center">
              <div className="flex flex-col items-center">
                <CheckCircle className="text-green-600" size={26} />
                <div className="text-green-600 font-medium mt-2">Chapters saved</div>
              </div>
              {topicsApproved ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className="text-green-600" size={26} />
                  <div className="text-green-600 font-medium mt-2">Topics saved</div>
                </div>
              ) : null}
            </div>

            {isGeneratingTopics ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-500" size={24} />
                <div className="text-gray-400 text-sm mt-3">Generating topics...</div>
              </div>
            ) : null}

            {!isGeneratingTopics && topicsApproved && !generatedConcepts && !conceptsApproved && !isGeneratingConcepts ? (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={handleGenerateConcepts}
                  disabled={isGeneratingConcepts}
                  className="bg-black text-white rounded-xl px-6 py-2 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGeneratingConcepts ? <Loader2 className="animate-spin text-white" size={16} /> : null}
                  Generate Concepts →
                </button>
              </div>
            ) : null}

            {topicsApproved && isGeneratingConcepts ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-500" size={24} />
                <div className="text-gray-400 text-sm mt-3">Generating concepts...</div>
              </div>
            ) : null}

            {topicsApproved && generatedConcepts && !conceptsApproved ? (
              <>
              <div className="relative">
                <div className="text-sm font-medium tracking-widest uppercase text-gray-400 mb-1">
                  Step 3 — Concepts
                </div>

                {generatedConcepts.topics.map((topicGroup) => {
                  const topicTitle = topicTitlesByTopicId[topicGroup.topicId] ?? "Topic";
                  const concepts = topicGroup.concepts.slice().sort((a, b) => a.order - b.order);
                  return (
                    <div key={topicGroup.topicId} className="mt-6">
                      <div className="flex items-center gap-2 mb-2 mt-6">
                        <Circle className="text-blue-400 shrink-0" size={14} />
                        <h3 className="text-sm font-semibold text-gray-700">{topicTitle}</h3>
                      </div>
                      <div className="ml-8">
                        {concepts.map((concept) => {
                          const conceptKey = `${topicGroup.topicId}-${concept.order}`;
                          return (
                            <div
                              key={conceptKey}
                              className="group flex items-center gap-3 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm mb-2"
                            >
                              <BookMarked className="text-blue-400 shrink-0" size={14} />
                              {editingConceptKey === conceptKey ? (
                                <input
                                  autoFocus
                                  value={concept.title}
                                  onChange={(e) =>
                                    updateConceptTitle(topicGroup.topicId, concept.order, e.target.value)
                                  }
                                  onBlur={() => setEditingConceptKey(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditingConceptKey(null);
                                  }}
                                  className="text-sm font-medium text-gray-800 border-b border-gray-300 outline-none bg-transparent flex-1"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingConceptKey(conceptKey)}
                                  className="text-sm font-medium text-gray-800 text-left flex-1"
                                >
                                  {concept.title}
                                </button>
                              )}
                              <div className="text-gray-400 text-xs shrink-0">{concept.order + 1}</div>
                              <button
                                type="button"
                                onClick={() => removeConcept(topicGroup.topicId, concept.order)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label={`Delete ${concept.title}`}
                              >
                                <Trash2 className="text-gray-300 hover:text-red-400" size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleApproveConcepts}
                  disabled={isRegeneratingConcepts || isApprovingConcepts}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApprovingConcepts ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : null}
                  Looks good →
                </button>
              </div>

              <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
                <label className="mb-2 block text-sm font-medium text-gray-700">Not quite right?</label>
                <textarea
                  value={conceptFeedback}
                  onChange={(e) => setConceptFeedback(e.target.value)}
                  placeholder="Tell us what to change — e.g. 'Add a concept on ethics to the Research Methods topics' or 'Be more specific in the Memory topics'"
                  className="min-h-[80px] w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder:text-xs text-gray-900"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRegenerateConcepts}
                    disabled={isRegeneratingConcepts || isApprovingConcepts}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRegeneratingConcepts ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Regenerate
                  </button>
                </div>
                {conceptError && (
                  <div className="mt-2">
                    <p className="text-sm text-red-500">{conceptError}</p>
                  </div>
                )}
              </div>
              </>
            ) : null}

            {!isGeneratingTopics && !topicsApproved && generatedTopics ? (
              <>
              <div className="relative">
                <div className="text-sm font-medium tracking-widest uppercase text-gray-400 mb-1">
                  Step 2 — Topics
                </div>

                {generatedTopics.chapters.map((chapter, chapterIdx) => {
                  const chapterId = chapter.chapterId;
                  const chapterTitle = chapter.title ?? "New Chapter";
                  const chapterTopics = chapter.topics.slice().sort((a, b) => a.order - b.order);
                  const isExpanded = expandedChapters.has(chapterId);
                  return (
                    <div key={`${chapterId}-${chapterIdx}`} className="mt-6">
                      <div
                        className="group flex items-center gap-2 rounded-lg px-2 py-1 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleChapterExpanded(chapterId)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="text-gray-400 shrink-0" size={14} />
                        ) : (
                          <ChevronRight className="text-gray-400 shrink-0" size={14} />
                        )}
                        {editingChapterId === chapterId ? (
                          <input
                            autoFocus
                            value={chapterTitle}
                            onChange={(e) => updateChapterTitle(chapterId, e.target.value)}
                            onBlur={() => setEditingChapterId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setEditingChapterId(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-semibold text-gray-700 border-b border-gray-300 outline-none bg-transparent"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChapterId(chapterId);
                            }}
                            className="text-sm font-semibold text-gray-700 text-left"
                          >
                            {chapterTitle}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeChapter(chapterId);
                          }}
                          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Delete ${chapterTitle}`}
                        >
                          <Trash2 className="text-gray-300 hover:text-red-400" size={14} />
                        </button>
                      </div>
                      {isExpanded ? (
                        <div className="ml-6">
                          {chapterTopics.map((topic, topicIdx) => {
                            const topicKey = `${chapterId}-${topic.order}`;
                            return (
                              <div
                                key={`${chapterId}-${topic.order}-${topicIdx}`}
                                className="group bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm mb-2"
                              >
                                <div className="flex items-center gap-3 w-full min-w-0">
                                  {editingTopicKey === topicKey ? (
                                    <input
                                      autoFocus
                                      value={topic.title}
                                      onChange={(e) => updateTopicTitle(chapterId, topic.order, e.target.value)}
                                      onBlur={() => setEditingTopicKey(null)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setEditingTopicKey(null);
                                        }
                                      }}
                                      className="text-sm font-medium text-gray-800 border-b border-gray-300 outline-none bg-transparent flex-1"
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditingTopicKey(topicKey)}
                                      className="text-sm font-medium text-gray-800 text-left flex-1"
                                    >
                                      {topic.title}
                                    </button>
                                  )}
                                  <div className="ml-auto text-gray-400 text-xs">{topic.order + 1}</div>
                                  <button
                                    type="button"
                                    onClick={() => removeTopic(chapterId, topic.order)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Delete topic ${topic.title}`}
                                  >
                                    <Trash2 className="text-gray-300 hover:text-red-400" size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => addTopic(chapterId)}
                            className="text-xs text-gray-400 hover:text-gray-600 ml-6 flex items-center gap-1"
                          >
                            <Plus size={12} />
                            Add topic
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={addChapter}
                  className="text-sm text-gray-400 hover:text-gray-600 mt-4 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add chapter
                </button>
                <button
                  type="button"
                  onClick={handleApproveTopics}
                  disabled={isRegeneratingTopics || isApprovingTopics}
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApprovingTopics ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : null}
                  Looks good →
                </button>
              </div>

              <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
                <label className="mb-2 block text-sm font-medium text-gray-700">Not quite right?</label>
                <textarea
                  value={topicFeedback}
                  onChange={(e) => setTopicFeedback(e.target.value)}
                  placeholder="Tell us what to change — e.g. 'Add a topic on ethics to the Research Methods chapter' or 'Merge the last two topics in Memory'"
                  className="min-h-[80px] w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder:text-xs text-gray-900"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRegenerateTopics}
                    disabled={isRegeneratingTopics || isApprovingTopics}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRegeneratingTopics ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Regenerate
                  </button>
                </div>
                {topicError && (
                  <div className="mt-2">
                    <p className="text-sm text-red-500">{topicError}</p>
                  </div>
                )}
              </div>
              </>
            ) : null}

            {!isGeneratingTopics && !topicsApproved && !generatedTopics ? (
              <div className="flex justify-center py-8">
                <button
                  type="button"
                  onClick={handleGenerateTopics}
                  disabled={isGeneratingTopics}
                  className="bg-black text-white rounded-xl px-6 py-2 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGeneratingTopics ? <Loader2 className="animate-spin text-white" size={16} /> : null}
                  Generate Topics →
                </button>
              </div>
            ) : null}

            {topicError ? <p className="text-red-500 text-sm mt-3 text-center">{topicError}</p> : null}
            {conceptError ? <p className="text-red-500 text-sm mt-3 text-center">{conceptError}</p> : null}
          </div>
        )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
