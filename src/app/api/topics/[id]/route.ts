import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  order: z.number().optional(),
});

async function checkTopicAccess(topicId: string, userId: string) {
  const t = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { chapter: { include: { course: true } } },
  });
  return t && t.chapter.course.userId === userId ? t : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const topic = await checkTopicAccess(id, user.id);
    if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.topic.update({
      where: { id },
      data: { title: data.title, order: data.order },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update topic" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const topic = await checkTopicAccess(id, user.id);
    if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.topic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete topic" }, { status: 500 });
  }
}
