import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ApproveConceptsSchema = z.object({
  topics: z
    .array(
      z.object({
        topicId: z.string().min(1),
        concepts: z.array(
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
    const { topics } = ApproveConceptsSchema.parse(body);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    for (const { topicId, concepts } of topics) {
      await prisma.concept.deleteMany({
        where: { topicId },
      });

      if (concepts.length > 0) {
        await prisma.concept.createMany({
          data: concepts.map((c) => ({
            title: c.title,
            order: c.order,
            topicId,
          })),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to approve concepts" },
      { status: 500 }
    );
  }
}
