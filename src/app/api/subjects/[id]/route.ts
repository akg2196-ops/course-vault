import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  order: z.number().optional(),
});

async function checkSubjectAccess(subjectId: string, userId: string) {
  const s = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { course: true },
  });
  return s && s.course.userId === userId ? s : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const subject = await checkSubjectAccess(id, user.id);
    if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.subject.update({
      where: { id },
      data: { title: data.title, order: data.order },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const subject = await checkSubjectAccess(id, user.id);
    if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
