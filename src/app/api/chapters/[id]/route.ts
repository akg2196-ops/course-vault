import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  order: z.number().optional(),
});

async function checkChapterAccess(chapterId: string, userId: string) {
  const c = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { course: true },
  });
  return c && c.course.userId === userId ? c : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const chapter = await checkChapterAccess(id, user.id);
    if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.chapter.update({
      where: { id },
      data: { title: data.title, order: data.order },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update chapter" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const chapter = await checkChapterAccess(id, user.id);
    if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.chapter.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete chapter" }, { status: 500 });
  }
}
