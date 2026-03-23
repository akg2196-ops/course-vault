import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ApproveTopicsSchema = z.object({
  chapters: z
    .array(
      z.object({
        chapterId: z.string().min(1),
        topics: z.array(
          z.object({
            title: z.string().min(1),
            order: z.number(),
          })
        ),
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
    const { chapters } = ApproveTopicsSchema.parse(body);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    for (const chapter of chapters) {
      await prisma.topic.deleteMany({
        where: { chapterId: chapter.chapterId },
      });

      if (chapter.topics.length > 0) {
        await prisma.topic.createMany({
          data: chapter.topics.map((t) => ({
            title: t.title,
            order: t.order,
            chapterId: chapter.chapterId,
          })),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to approve topics" },
      { status: 500 }
    );
  }
}
