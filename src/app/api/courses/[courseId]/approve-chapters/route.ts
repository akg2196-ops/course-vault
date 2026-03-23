import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const approveChaptersSchema = z.object({
  chapters: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        order: z.number(),
      })
    )
    .nonempty(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const body = await req.json();
    const parsed = approveChaptersSchema.parse(body);
    const { chapters } = parsed;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Regeneration support: remove any existing chapters for this course first.
    await prisma.chapter.deleteMany({
      where: { courseId },
    });

    await prisma.chapter.createMany({
      data: chapters.map((c) => ({
        title: c.title,
        order: c.order,
        courseId,
      })),
    });

    const savedChapters = await prisma.chapter.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ ok: true, chapters: savedChapters });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to approve chapters" },
      { status: 500 }
    );
  }
}

