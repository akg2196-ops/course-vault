"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Calendar, Circle, FileText, Trash2 } from "lucide-react";

type Topic = {
  id: string;
  title: string;
  order: number;
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
  createdAt: string;
  slug: string | null;
  chapters: Chapter[];
};

type ApiOk = { courses: Course[] };
type ApiErr = { error: string };

function formatCreatedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getCourseStatus(course: Course): "complete" | "in_progress" | "empty" {
  const chapterCount = course.chapters?.length ?? 0;
  if (chapterCount === 0) return "empty";
  const topicCount = course.chapters.reduce((sum, ch) => sum + (ch.topics?.length ?? 0), 0);
  if (topicCount === 0) return "in_progress";
  return "complete";
}

export default function MyCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/courses");
        const data = (await res.json()) as ApiOk & ApiErr;
        if (!res.ok) throw new Error(data.error || "Failed to load courses");
        if (!cancelled) setCourses(data.courses ?? []);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Something went wrong.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteCourse = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this course? This cannot be undone."
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Failed to delete course. Please try again.");
        return;
      }
      setCourses((prev) => (prev ? prev.filter((c) => c.id !== courseId) : prev));
    } catch {
      alert("Failed to delete course. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 pb-16 pt-[1cm]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-10 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <Link
            href="/courses/new"
            className="inline-flex items-center justify-center shrink-0 self-start sm:self-auto rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + New Course
          </Link>
        </div>
        <p className="text-gray-500 text-sm mb-8">All your courses in one place.</p>

        {loadError ? (
          <p className="text-red-600 text-sm" role="alert">
            {loadError}
          </p>
        ) : null}

        {courses === null && !loadError ? (
          <div className="text-gray-500 text-sm py-12">Loading...</div>
        ) : null}

        {courses && courses.length === 0 && !loadError ? (
          <div className="flex flex-col items-center py-24">
            <BookOpen className="text-gray-300" size={48} />
            <h2 className="text-gray-400 text-lg mt-4">No courses yet</h2>
            <p className="text-gray-400 text-sm mt-1">Create your first course to get started.</p>
            <Link
              href="/courses/new"
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + New Course
            </Link>
          </div>
        ) : null}

        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {courses.map((course) => {
              const status = getCourseStatus(course);
              const chapterCount = course.chapters?.length ?? 0;
              const topicCount = course.chapters.reduce((sum, ch) => sum + (ch.topics?.length ?? 0), 0);

              return (
                <div
                  key={course.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/courses/${course.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/courses/${course.id}`);
                    }
                  }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-bold text-gray-900 min-w-0">{course.title}</h2>
                    <div className="flex items-center shrink-0">
                      {status === "complete" ? (
                        <span className="bg-green-50 text-green-700 border border-green-200 text-xs px-3 py-1 rounded-full">
                          Complete
                        </span>
                      ) : status === "in_progress" ? (
                        <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-3 py-1 rounded-full">
                          In Progress
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">Empty</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCourse(e, course.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer ml-2 p-0 border-0 bg-transparent inline-flex items-center justify-center"
                        aria-label={`Delete ${course.title}`}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-6">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <FileText className="text-blue-400 shrink-0" size={14} aria-hidden />
                      {chapterCount} {chapterCount === 1 ? "chapter" : "chapters"}
                    </span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Circle className="text-blue-400 shrink-0" size={14} aria-hidden />
                      {topicCount} {topicCount === 1 ? "topic" : "topics"}
                    </span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="text-gray-400 shrink-0" size={14} aria-hidden />
                      {formatCreatedAt(course.createdAt)}
                    </span>
                  </div>

                  <div className="mt-6">
                    {status !== "complete" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/courses/${course.id}/map`);
                        }}
                        className="text-sm border border-gray-300 text-gray-700 rounded-xl px-4 py-2 hover:bg-gray-50"
                      >
                        Continue building →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/courses/${course.id}`);
                        }}
                        className="text-sm border border-green-300 text-green-700 rounded-xl px-4 py-2 hover:bg-green-50"
                      >
                        View course →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
