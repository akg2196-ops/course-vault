import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  chapterId: z.string(),
  title: z.string().min(1),
  order: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const body = await req.json();
    const { chapterId, title, order } = createSchema.parse(body);
    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId },
      include: { course: true },
    });
    if (!chapter || chapter.course.userId !== user.id) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    const count = await prisma.topic.count({ where: { chapterId } });
    const topic = await prisma.topic.create({
      data: {
        chapterId,
        title,
        order: order ?? count,
      },
    });
    return NextResponse.json({ topic });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }
}
