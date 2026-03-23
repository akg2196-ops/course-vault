"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Circle,
  BookMarked,
  X,
  Loader2,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

type Concept = {
  id: string;
  title: string;
  order: number;
  summary: string | null;
  vocabulary: string | null;
  examples: string | null;
  tags: string | null;
  difficulty: string | null;
};

type Topic = {
  id: string;
  title: string;
  order: number;
  concepts: Concept[];
};

type Chapter = {
  id: string;
  title: string;
  order: number;
  topics: Topic[];
};

type Course = {
  id: string;
  title: string;
  chapters: Chapter[];
};

type EditingNodeType = "chapter" | "topic" | "concept";

function getRelativeToContainer(el: HTMLElement, container: HTMLElement) {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return {
    left: er.left - cr.left,
    top: er.top - cr.top,
    right: er.right - cr.left,
    bottom: er.bottom - cr.top,
    width: er.width,
    height: er.height,
  };
}

type ArrowPathsProps = {
  treeRef: React.RefObject<HTMLDivElement | null>;
  paths: string[];
};

function ArrowSvgOverlay({ treeRef, paths }: ArrowPathsProps) {
  const tree = treeRef.current;
  if (!tree || paths.length === 0) return null;
  const w = tree.scrollWidth;
  const h = tree.scrollHeight;
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-0 overflow-visible"
      width={w}
      height={h}
      aria-hidden
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

type EditableNodeCardProps = {
  icon: LucideIcon;
  title: string;
  isSelected: boolean;
  onSelectCard: () => void;
  isEditing: boolean;
  draftTitle: string;
  onStartEditTitle: () => void;
  onDraftChange: (v: string) => void;
  onCommitTitle: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  cardRef?: React.LegacyRef<HTMLDivElement>;
};

function EditableNodeCard({
  icon: Icon,
  title,
  isSelected,
  onSelectCard,
  isEditing,
  draftTitle,
  onStartEditTitle,
  onDraftChange,
  onCommitTitle,
  onCancelEdit,
  onDelete,
  cardRef,
}: EditableNodeCardProps) {
  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onSelectCard}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectCard();
        }
      }}
      className={`
        group flex w-fit min-w-[200px] max-w-[280px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-sm
        transition-all
        hover:border-gray-300 hover:shadow-md
        ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}
      `}
    >
      <Icon className="mt-0.5 h-[14px] w-[14px] shrink-0 text-blue-400" />
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => onDraftChange(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={onCommitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCommitTitle();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onCancelEdit();
              }
            }}
            className="w-full border-b border-gray-300 bg-transparent text-sm font-medium text-gray-800 outline-none"
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onStartEditTitle();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onStartEditTitle();
              }
            }}
            className="block cursor-text text-sm font-medium text-gray-800 break-words"
          >
            {title}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
        aria-label="Delete"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

type CourseNodeCardProps = {
  icon: LucideIcon;
  title: string;
  isSelected: boolean;
  onSelectCard: () => void;
};

const CourseNodeCard = forwardRef<HTMLDivElement, CourseNodeCardProps>(function CourseNodeCard(
  { icon: Icon, title, isSelected, onSelectCard },
  ref
) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelectCard}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectCard();
        }
      }}
      className={`
        flex w-fit min-w-[200px] max-w-[280px] cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-sm
        transition-all
        hover:border-gray-300 hover:shadow-md
        ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}
      `}
    >
      <Icon className="mt-0.5 h-[14px] w-[14px] shrink-0 text-blue-400" />
      <span className="text-sm font-medium text-gray-800 break-words">{title}</span>
    </div>
  );
});

function parseVocabularyItems(v: string | null): Array<{ term: string; definition: string }> {
  const empty = (): Array<{ term: string; definition: string }> => [{ term: "", definition: "" }];
  if (!v || !v.trim()) return empty();
  try {
    const parsed = JSON.parse(v) as unknown;
    if (Array.isArray(parsed)) {
      const items = parsed.map((p: unknown) => {
        if (p && typeof p === "object") {
          const o = p as { term?: unknown; definition?: unknown };
          return {
            term: typeof o.term === "string" ? o.term : "",
            definition: typeof o.definition === "string" ? o.definition : "",
          };
        }
        return { term: "", definition: "" };
      });
      if (items.length === 0) return empty();
      return items;
    }
  } catch {
    // legacy plain string
  }
  return [{ term: v, definition: "" }];
}

function tagsToList(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function normalizeDifficulty(d: string | null): "easy" | "medium" | "hard" {
  const x = (d ?? "").toLowerCase();
  if (x === "easy" || x === "medium" || x === "hard") return x;
  return "medium";
}

type ConceptDetailPanelProps = {
  concept: Concept | null;
  onClose: () => void;
  onGenerateNotes: (conceptId: string) => Promise<void>;
  isGeneratingNotes: boolean;
  notesMessage: { type: "success" | "error"; text: string } | null;
  onConceptUpdated: (concept: Concept) => void;
};

function ConceptDetailPanel({
  concept,
  onClose,
  onGenerateNotes,
  isGeneratingNotes,
  notesMessage,
  onConceptUpdated,
}: ConceptDetailPanelProps) {
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const [summary, setSummary] = useState("");
  const [vocabItems, setVocabItems] = useState<Array<{ term: string; definition: string }>>([]);
  const [examples, setExamples] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [difficulty, setDifficulty] = useState<"" | "easy" | "medium" | "hard">("medium");
  const [saveFeedback, setSaveFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const isResizing = useRef(false);

  const handleMouseDown = () => {
    isResizing.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isResizing.current = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!concept) return;
    setSummary(concept.summary ?? "");
    setVocabItems(parseVocabularyItems(concept.vocabulary));
    setExamples(concept.examples ?? "");
    setTags(tagsToList(concept.tags));
    const d = concept.difficulty;
    const x = (d ?? "").toLowerCase();
    if (x === "easy" || x === "medium" || x === "hard") {
      setDifficulty(x);
    } else {
      setDifficulty("");
    }
    setTagInput("");
    setSaveFeedback(null);
  }, [
    concept?.id,
    concept?.summary,
    concept?.vocabulary,
    concept?.examples,
    concept?.tags,
    concept?.difficulty,
  ]);

  const handleSaveFields = async (e: FormEvent) => {
    e.preventDefault();
    if (!concept) return;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const res = await fetch(`/api/concepts/${concept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          vocabulary: JSON.stringify(vocabItems.filter((vi) => vi.term.trim())),
          examples,
          tags: JSON.stringify(tags),
          difficulty: normalizeDifficulty(difficulty || null),
        }),
      });
      const data = (await res.json()) as { error?: unknown; concept?: Concept };
      if (!res.ok) {
        const err = data.error;
        throw new Error(
          typeof err === "string" ? err : err != null ? JSON.stringify(err) : "Failed to save"
        );
      }
      if (data.concept) onConceptUpdated(data.concept);
      setSaveFeedback({ type: "success", text: "Saved!" });
      window.setTimeout(() => setSaveFeedback(null), 2000);
    } catch (err) {
      setSaveFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addTagFromInput = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  return (
    <div
      className={`
        fixed right-0 z-50 overflow-y-auto border-l border-gray-200 bg-white shadow-xl
        transition-transform duration-300 ease-out
        ${concept ? "translate-x-0" : "translate-x-full"}
      `}
      style={{ top: "4rem", height: "calc(100vh - 4rem)", width: sidebarWidth }}
    >
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize transition-colors hover:bg-blue-300"
        aria-hidden
      />
      <div className="flex h-full flex-col overflow-hidden">
        <div className="relative flex items-start justify-between border-b border-gray-200 p-4">
          <h2 className="pr-10 text-xl font-bold text-gray-900">{concept?.title ?? ""}</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="flex flex-1 flex-col overflow-hidden" onSubmit={handleSaveFields}>
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {concept ? (
              <>
                <section>
                  <h3 className="mb-1 text-sm font-semibold text-gray-700">Summary</h3>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={3}
                    placeholder="Write a summary..."
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-300 focus:outline-none"
                  />
                </section>

                <section className="flex flex-col">
                  <h3 className="mb-1 text-sm font-semibold text-gray-700">Vocabulary</h3>
                  <div className="mb-1 flex gap-2 text-xs text-gray-400">
                    <div className="min-w-0 flex-1">Term</div>
                    <div className="min-w-0 flex-[2]">Definition</div>
                    <div className="w-6 shrink-0" aria-hidden />
                  </div>
                  {vocabItems.map((item, index) => (
                    <div key={index} className="mb-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Term"
                        value={item.term}
                        onChange={(e) => {
                          const next = [...vocabItems];
                          next[index] = { ...next[index], term: e.target.value };
                          setVocabItems(next);
                        }}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-300 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Definition"
                        value={item.definition}
                        onChange={(e) => {
                          const next = [...vocabItems];
                          next[index] = { ...next[index], definition: e.target.value };
                          setVocabItems(next);
                        }}
                        className="flex-[2] rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setVocabItems(vocabItems.filter((_, i) => i !== index))}
                        className="shrink-0 text-gray-300 hover:text-red-400"
                        aria-label="Remove term"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setVocabItems([...vocabItems, { term: "", definition: "" }])}
                    className="mt-1 flex cursor-pointer items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    <Plus size={12} />
                    Add term
                  </button>
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-gray-700">Examples</h3>
                  <textarea
                    value={examples}
                    onChange={(e) => setExamples(e.target.value)}
                    rows={3}
                    placeholder="Add examples..."
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-300 focus:outline-none"
                  />
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-gray-700">Tags</h3>
                  {tags.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => setTags(tags.filter((x) => x !== tag))}
                            className="text-gray-500 hover:text-gray-800"
                            aria-label={`Remove ${tag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTagFromInput();
                      }
                    }}
                    placeholder="Add a tag…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-300 focus:outline-none"
                  />
                </section>

                <section>
                  <h3 className="mb-1 text-sm font-semibold text-gray-700">Difficulty</h3>
                  <select
                    value={difficulty}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDifficulty(v === "" ? "" : (v as "easy" | "medium" | "hard"));
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900"
                  >
                    <option value="">Select difficulty</option>
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                </section>
              </>
            ) : null}
          </div>

          <div className="border-t border-gray-200 p-4">
            <button
              type="submit"
              disabled={isSaving || !concept}
              className="mb-3 w-full rounded-xl bg-gray-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
            {saveFeedback?.type === "success" ? (
              <p className="mb-3 text-sm text-green-600">{saveFeedback.text}</p>
            ) : null}
            {saveFeedback?.type === "error" ? (
              <p className="mb-3 text-sm text-red-500">{saveFeedback.text}</p>
            ) : null}
            <button
              type="button"
              onClick={() => concept && onGenerateNotes(concept.id)}
              disabled={isGeneratingNotes || !concept}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingNotes ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
              Generate notes
            </button>
            {notesMessage?.type === "success" ? (
              <p className="mt-2 text-sm text-green-600">Notes generated!</p>
            ) : null}
            {notesMessage?.type === "error" ? (
              <p className="mt-2 text-sm text-red-500">{notesMessage.text}</p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

type Props = {
  course: Course;
};

function findConceptInCourse(course: Course, conceptId: string): Concept | null {
  for (const ch of course.chapters ?? []) {
    for (const t of ch.topics ?? []) {
      const c = (t.concepts ?? []).find((c) => c.id === conceptId);
      if (c) return c;
    }
  }
  return null;
}

function cloneCourse(c: Course): Course {
  return JSON.parse(JSON.stringify(c)) as Course;
}

export function CourseTreeCanvas({ course }: Props) {
  const router = useRouter();
  const [localCourse, setLocalCourse] = useState<Course>(() => cloneCourse(course));

  useEffect(() => {
    setLocalCourse(cloneCourse(course));
  }, [course]);

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeType, setEditingNodeType] = useState<EditingNodeType | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [notesMessage, setNotesMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const treeRef = useRef<HTMLDivElement>(null);
  const courseRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const topicRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const conceptRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [arrowTick, setArrowTick] = useState(0);
  const redrawArrows = useCallback(() => setArrowTick((n) => n + 1), []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", redrawArrows, { passive: true });
    const ro = new ResizeObserver(redrawArrows);
    ro.observe(el);
    if (treeRef.current) ro.observe(treeRef.current);
    window.addEventListener("resize", redrawArrows);
    return () => {
      el.removeEventListener("scroll", redrawArrows);
      ro.disconnect();
      window.removeEventListener("resize", redrawArrows);
    };
  }, [redrawArrows]);

  const chapters = [...(localCourse.chapters ?? [])].sort((a, b) => a.order - b.order);
  const selectedChapter = selectedChapterId ? chapters.find((c) => c.id === selectedChapterId) : null;
  const topics = selectedChapter
    ? [...(selectedChapter.topics ?? [])].sort((a, b) => a.order - b.order)
    : [];
  const selectedTopic = selectedTopicId ? topics.find((t) => t.id === selectedTopicId) : null;
  const concepts = selectedTopic
    ? [...(selectedTopic.concepts ?? [])].sort((a, b) => a.order - b.order)
    : [];

  const selectedConcept = selectedConceptId ? findConceptInCourse(localCourse, selectedConceptId) : null;

  useLayoutEffect(() => {
    redrawArrows();
  }, [redrawArrows, selectedChapterId, selectedTopicId]);

  const handleChapterClick = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    setSelectedTopicId(null);
    setSelectedConceptId(null);
  };

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    setSelectedConceptId(null);
  };

  const handleConceptClick = (concept: Concept) => {
    setSelectedConceptId(concept.id);
    setNotesMessage(null);
  };

  const startEdit = (id: string, type: EditingNodeType, currentTitle: string) => {
    setEditingNodeId(id);
    setEditingNodeType(type);
    setDraftTitle(currentTitle);
  };

  const cancelEdit = () => {
    setEditingNodeId(null);
    setEditingNodeType(null);
    setDraftTitle("");
  };

  const commitTitle = async () => {
    if (!editingNodeId || !editingNodeType) {
      cancelEdit();
      return;
    }
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }

    const id = editingNodeId;
    const type = editingNodeType;

    try {
      if (type === "chapter") {
        const res = await fetch(`/api/chapters/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to update chapter");
        setLocalCourse((prev) => ({
          ...prev,
          chapters: prev.chapters.map((ch) => (ch.id === id ? { ...ch, title: trimmed } : ch)),
        }));
      } else if (type === "topic") {
        const res = await fetch(`/api/topics/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to update topic");
        setLocalCourse((prev) => ({
          ...prev,
          chapters: prev.chapters.map((ch) => ({
            ...ch,
            topics: ch.topics.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
          })),
        }));
      } else if (type === "concept") {
        const res = await fetch(`/api/concepts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to update concept");
        setLocalCourse((prev) => ({
          ...prev,
          chapters: prev.chapters.map((ch) => ({
            ...ch,
            topics: ch.topics.map((t) => ({
              ...t,
              concepts: t.concepts.map((c) => (c.id === id ? { ...c, title: trimmed } : c)),
            })),
          })),
        }));
      }
      cancelEdit();
    } catch {
      // keep editing so user can retry
    }
  };

  const handleConceptUpdated = (updated: Concept) => {
    setLocalCourse((prev) => ({
      ...prev,
      chapters: prev.chapters.map((ch) => ({
        ...ch,
        topics: ch.topics.map((t) => ({
          ...t,
          concepts: t.concepts.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
        })),
      })),
    }));
  };

  const handleAddChapter = async () => {
    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Chapter",
          courseId: localCourse.id,
          order: chapters.length,
        }),
      });
      const data = (await res.json()) as { chapter?: Chapter; error?: unknown };
      if (!res.ok) {
        const err = data.error;
        throw new Error(typeof err === "string" ? err : "Failed to create chapter");
      }
      const raw = data.chapter;
      if (!raw) throw new Error("Invalid response");
      const newChapter: Chapter = { ...raw, topics: raw.topics ?? [] };
      setLocalCourse((prev) => ({
        ...prev,
        chapters: [...prev.chapters, newChapter].sort((a, b) => a.order - b.order),
      }));
      setSelectedChapterId(newChapter.id);
      setSelectedTopicId(null);
      setSelectedConceptId(null);
      startEdit(newChapter.id, "chapter", newChapter.title);
    } catch {
      // ignore
    }
  };

  const handleAddTopic = async () => {
    if (!selectedChapterId) return;
    const ch = chapters.find((c) => c.id === selectedChapterId);
    if (!ch) return;
    const topicCount = ch.topics.length;
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Topic",
          chapterId: selectedChapterId,
          order: topicCount,
        }),
      });
      const data = (await res.json()) as { topic?: Topic; error?: unknown };
      if (!res.ok) {
        const err = data.error;
        throw new Error(typeof err === "string" ? err : "Failed to create topic");
      }
      const raw = data.topic;
      if (!raw) throw new Error("Invalid response");
      const newTopic: Topic = { ...raw, concepts: raw.concepts ?? [] };
      setLocalCourse((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === selectedChapterId
            ? {
                ...c,
                topics: [...c.topics, newTopic].sort((a, b) => a.order - b.order),
              }
            : c
        ),
      }));
      setSelectedTopicId(newTopic.id);
      setSelectedConceptId(null);
      startEdit(newTopic.id, "topic", newTopic.title);
    } catch {
      // ignore
    }
  };

  const handleAddConcept = async () => {
    if (!selectedTopicId || !selectedChapterId) return;
    const ch = chapters.find((c) => c.id === selectedChapterId);
    const top = ch?.topics.find((t) => t.id === selectedTopicId);
    if (!top) return;
    const conceptCount = top.concepts.length;
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Concept",
          topicId: selectedTopicId,
          order: conceptCount,
        }),
      });
      const data = (await res.json()) as { concept?: Concept; error?: unknown };
      if (!res.ok) {
        const err = data.error;
        throw new Error(typeof err === "string" ? err : "Failed to create concept");
      }
      const raw = data.concept;
      if (!raw) throw new Error("Invalid response");
      const newConcept: Concept = raw;
      setLocalCourse((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) =>
          c.id === selectedChapterId
            ? {
                ...c,
                topics: c.topics.map((t) =>
                  t.id === selectedTopicId
                    ? {
                        ...t,
                        concepts: [...t.concepts, newConcept].sort((a, b) => a.order - b.order),
                      }
                    : t
                ),
              }
            : c
        ),
      }));
      setSelectedConceptId(newConcept.id);
      setNotesMessage(null);
      startEdit(newConcept.id, "concept", newConcept.title);
    } catch {
      // ignore
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete chapter");
      setLocalCourse((prev) => ({
        ...prev,
        chapters: prev.chapters.filter((ch) => ch.id !== chapterId),
      }));
      if (selectedChapterId === chapterId) {
        setSelectedChapterId(null);
        setSelectedTopicId(null);
        setSelectedConceptId(null);
      }
      if (editingNodeId === chapterId) cancelEdit();
    } catch {
      // ignore
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      const res = await fetch(`/api/topics/${topicId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete topic");
      setLocalCourse((prev) => ({
        ...prev,
        chapters: prev.chapters.map((ch) => ({
          ...ch,
          topics: ch.topics.filter((t) => t.id !== topicId),
        })),
      }));
      if (selectedTopicId === topicId) {
        setSelectedTopicId(null);
        setSelectedConceptId(null);
      }
      if (editingNodeId === topicId) cancelEdit();
    } catch {
      // ignore
    }
  };

  const handleDeleteConcept = async (conceptId: string) => {
    try {
      const res = await fetch(`/api/concepts/${conceptId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete concept");
      setLocalCourse((prev) => ({
        ...prev,
        chapters: prev.chapters.map((ch) => ({
          ...ch,
          topics: ch.topics.map((t) => ({
            ...t,
            concepts: t.concepts.filter((c) => c.id !== conceptId),
          })),
        })),
      }));
      if (selectedConceptId === conceptId) {
        setSelectedConceptId(null);
      }
      if (editingNodeId === conceptId) cancelEdit();
    } catch {
      // ignore
    }
  };

  const handleGenerateNotes = async (conceptId: string) => {
    setIsGeneratingNotes(true);
    setNotesMessage(null);
    try {
      const res = await fetch("/api/ai/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId }),
      });
      const data = (await res.json()) as { error?: unknown; concept?: Concept };
      console.log("generate-notes response:", res.status, data);
      if (!res.ok) {
        const err = data.error;
        throw new Error(
          typeof err === "string" ? err : err != null ? JSON.stringify(err) : "Failed"
        );
      }
      if (data.concept) {
        handleConceptUpdated(data.concept);
      }
      setNotesMessage({ type: "success", text: "Notes generated!" });
      router.refresh();
    } catch (e) {
      console.error("generate-notes client error:", e);
      setNotesMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Something went wrong",
      });
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const tree = treeRef.current;
  const courseEl = courseRef.current;
  const arrowPaths: string[] = [];

  void arrowTick;

  if (tree && courseEl) {
    const pushPath = (from: HTMLElement, to: HTMLElement) => {
      const r1 = getRelativeToContainer(from, tree);
      const r2 = getRelativeToContainer(to, tree);
      const x1 = r1.right;
      const y1 = r1.top + r1.height / 2;
      const x2 = r2.left;
      const y2 = r2.top + r2.height / 2;
      const midX = (x1 + x2) / 2;
      arrowPaths.push(`M ${x1} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2} ${y2}`);
    };

    for (const ch of chapters) {
      const chEl = chapterRefs.current.get(ch.id);
      if (chEl) pushPath(courseEl, chEl);
    }

    if (selectedChapterId) {
      const chEl = chapterRefs.current.get(selectedChapterId);
      if (chEl) {
        for (const t of topics) {
          const tEl = topicRefs.current.get(t.id);
          if (tEl) pushPath(chEl, tEl);
        }
      }
    }

    if (selectedTopicId) {
      const tEl = topicRefs.current.get(selectedTopicId);
      if (tEl) {
        for (const c of concepts) {
          const cEl = conceptRefs.current.get(c.id);
          if (cEl) pushPath(tEl, cEl);
        }
      }
    }
  }

  void arrowTick;

  const setChapterRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) chapterRefs.current.set(id, el);
    else chapterRefs.current.delete(id);
  };
  const setTopicRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) topicRefs.current.set(id, el);
    else topicRefs.current.delete(id);
  };
  const setConceptRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) conceptRefs.current.set(id, el);
    else conceptRefs.current.delete(id);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div
        ref={scrollRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto"
      >
        <div ref={treeRef} className="relative flex min-w-max flex-row gap-32 p-20">
          <ArrowSvgOverlay treeRef={treeRef} paths={arrowPaths} />

          {/* Column 1: Course */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-8">
            <CourseNodeCard
              ref={courseRef}
              icon={BookOpen}
              title={localCourse.title}
              isSelected={!selectedChapterId}
              onSelectCard={() => {
                setSelectedChapterId(null);
                setSelectedTopicId(null);
                setSelectedConceptId(null);
              }}
            />
          </div>

          {/* Column 2: Chapters */}
          <div className="relative z-10 flex min-w-[200px] flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-8">
              {chapters.length === 0 ? (
                <p className="min-w-[200px] py-4 text-sm italic text-gray-500">
                  No chapters yet. Go to Course Builder to add content.
                </p>
              ) : (
                chapters.map((ch) => (
                  <EditableNodeCard
                    key={ch.id}
                    cardRef={setChapterRef(ch.id)}
                    icon={FileText}
                    title={ch.title}
                    isSelected={selectedChapterId === ch.id}
                    onSelectCard={() => handleChapterClick(ch.id)}
                    isEditing={editingNodeId === ch.id && editingNodeType === "chapter"}
                    draftTitle={draftTitle}
                    onStartEditTitle={() => startEdit(ch.id, "chapter", ch.title)}
                    onDraftChange={setDraftTitle}
                    onCommitTitle={commitTitle}
                    onCancelEdit={cancelEdit}
                    onDelete={() => void handleDeleteChapter(ch.id)}
                  />
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleAddChapter()}
              className="mt-4 flex cursor-pointer items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
            >
              <Plus size={14} />
              Add chapter
            </button>
          </div>

          {/* Column 3: Topics */}
          <div className="relative z-10 flex min-w-[200px] flex-col items-center justify-center">
            {selectedChapter ? (
              <>
                <div className="flex flex-col items-center justify-center gap-8">
                  {topics.length === 0 ? (
                    <p className="py-4 text-sm italic text-gray-500">No topics</p>
                  ) : (
                    topics.map((t) => (
                      <EditableNodeCard
                        key={t.id}
                        cardRef={setTopicRef(t.id)}
                        icon={Circle}
                        title={t.title}
                        isSelected={selectedTopicId === t.id}
                        onSelectCard={() => handleTopicClick(t.id)}
                        isEditing={editingNodeId === t.id && editingNodeType === "topic"}
                        draftTitle={draftTitle}
                        onStartEditTitle={() => startEdit(t.id, "topic", t.title)}
                        onDraftChange={setDraftTitle}
                        onCommitTitle={commitTitle}
                        onCancelEdit={cancelEdit}
                        onDelete={() => void handleDeleteTopic(t.id)}
                      />
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddTopic()}
                  className="mt-4 flex cursor-pointer items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
                >
                  <Plus size={14} />
                  Add topic
                </button>
              </>
            ) : null}
          </div>

          {/* Column 4: Concepts */}
          <div className="relative z-10 flex min-w-[200px] flex-col items-center justify-center">
            {selectedTopic ? (
              <>
                <div className="flex flex-col items-center justify-center gap-8">
                  {concepts.length === 0 ? (
                    <p className="py-4 text-sm italic text-gray-500">No concepts</p>
                  ) : (
                    concepts.map((c) => (
                      <EditableNodeCard
                        key={c.id}
                        cardRef={setConceptRef(c.id)}
                        icon={BookMarked}
                        title={c.title}
                        isSelected={selectedConcept?.id === c.id}
                        onSelectCard={() => handleConceptClick(c)}
                        isEditing={editingNodeId === c.id && editingNodeType === "concept"}
                        draftTitle={draftTitle}
                        onStartEditTitle={() => startEdit(c.id, "concept", c.title)}
                        onDraftChange={setDraftTitle}
                        onCommitTitle={commitTitle}
                        onCancelEdit={cancelEdit}
                        onDelete={() => void handleDeleteConcept(c.id)}
                      />
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleAddConcept()}
                  className="mt-4 flex cursor-pointer items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
                >
                  <Plus size={14} />
                  Add concept
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <ConceptDetailPanel
        concept={selectedConcept}
        onClose={() => {
          setSelectedConceptId(null);
          setNotesMessage(null);
        }}
        onGenerateNotes={handleGenerateNotes}
        isGeneratingNotes={isGeneratingNotes}
        notesMessage={notesMessage}
        onConceptUpdated={handleConceptUpdated}
      />
    </div>
  );
}
