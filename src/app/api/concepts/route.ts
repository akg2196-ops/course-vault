import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  topicId: z.string(),
  title: z.string().min(1),
  order: z.number().optional(),
  summary: z.string().optional(),
  vocabulary: z.string().optional(),
  examples: z.string().optional(),
  tags: z.string().optional(),
  difficulty: z.string().optional(),
  sourceLinks: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const body = await req.json();
    const data = createSchema.parse(body);
    const topic = await prisma.topic.findFirst({
      where: { id: data.topicId },
      include: { chapter: { include: { course: true } } },
    });
    if (!topic || topic.chapter.course.userId !== user.id) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }
    const count = await prisma.concept.count({ where: { topicId: data.topicId } });
    const concept = await prisma.concept.create({
      data: {
        topicId: data.topicId,
        title: data.title,
        order: data.order ?? count,
        summary: data.summary ?? null,
        vocabulary: data.vocabulary ?? null,
        examples: data.examples ?? null,
        tags: data.tags ?? null,
        difficulty: data.difficulty ?? null,
        sourceLinks: data.sourceLinks ?? null,
      },
    });
    return NextResponse.json({ concept });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create concept" }, { status: 500 });
  }
}
