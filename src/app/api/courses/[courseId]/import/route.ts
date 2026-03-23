import { NextRequest, NextResponse } from "next/server";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface ImportSubject {
  title: string;
  order?: number;
  chapters?: ImportChapter[];
}

interface ImportChapter {
  title: string;
  order?: number;
  topics?: ImportTopic[];
}

interface ImportTopic {
  title: string;
  order?: number;
  concepts?: ImportConcept[];
}

interface ImportConcept {
  title: string;
  order?: number;
  summary?: string;
  vocabulary?: string;
  examples?: string;
  tags?: string;
  difficulty?: string;
}

/** POST /api/courses/[courseId]/import - bulk create map from JSON */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { courseId } = await params;
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: user.id },
    });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const body = await req.json();
    const subjects = Array.isArray(body.subjects) ? body.subjects : Array.isArray(body) ? body : [];
    if (!subjects.length) {
      return NextResponse.json(
        { error: "JSON must have 'subjects' array (or root array of subjects)" },
        { status: 400 }
      );
    }

    // With chapters now attached directly to the course, the imported "subjects"
    // array is treated as an ordering/grouping helper only.
    for (let i = 0; i < subjects.length; i++) {
      const s = subjects[i] as ImportSubject;
      const chapters = s.chapters ?? [];
      for (let j = 0; j < chapters.length; j++) {
        const c = chapters[j] as ImportChapter;
        const chapter = await prisma.chapter.create({
          data: {
            courseId,
            title: c.title ?? `Chapter ${j + 1}`,
            // Preserve the relative order of chapters across subjects.
            order: (s.order ?? i) * 1000 + (c.order ?? j),
          },
        });
        const topics = c.topics ?? [];
        for (let k = 0; k < topics.length; k++) {
          const t = topics[k] as ImportTopic;
          const topic = await prisma.topic.create({
            data: {
              chapterId: chapter.id,
              title: t.title ?? `Topic ${k + 1}`,
              order: t.order ?? k,
            },
          });
          const concepts = t.concepts ?? [];
          for (let h = 0; h < concepts.length; h++) {
            const cn = concepts[h] as ImportConcept;
            await prisma.concept.create({
              data: {
                topicId: topic.id,
                title: cn.title ?? `Concept ${h + 1}`,
                order: cn.order ?? h,
                summary: cn.summary ?? null,
                vocabulary: cn.vocabulary ?? null,
                examples: cn.examples ?? null,
                tags: cn.tags ?? null,
                difficulty: cn.difficulty ?? null,
              },
            });
          }
        }
      }
    }

    const updated = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: { concepts: { orderBy: { order: "asc" } } },
            },
          },
        },
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
