import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  order: z.number().optional(),
  summary: z.string().nullable().optional(),
  vocabulary: z.string().nullable().optional(),
  examples: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  lastReviewed: z.string().datetime().nullable().optional(),
  sourceLinks: z.string().nullable().optional(),
});

async function checkConceptAccess(conceptId: string, userId: string) {
  const c = await prisma.concept.findUnique({
    where: { id: conceptId },
    include: {
      topic: {
        include: {
          chapter: { include: { course: true } },
        },
      },
    },
  });
  return c && c.topic.chapter.course.userId === userId ? c : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const concept = await checkConceptAccess(id, user.id);
    if (!concept) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const data = updateSchema.parse(body);
    const update: Record<string, unknown> = {};
    if (data.title != null) update.title = data.title;
    if (data.order != null) update.order = data.order;
    if (data.summary !== undefined) update.summary = data.summary;
    if (data.vocabulary !== undefined) update.vocabulary = data.vocabulary;
    if (data.examples !== undefined) update.examples = data.examples;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.difficulty !== undefined) update.difficulty = data.difficulty;
    if (data.sourceLinks !== undefined) update.sourceLinks = data.sourceLinks;
    if (data.lastReviewed !== undefined) {
      update.lastReviewed = data.lastReviewed ? new Date(data.lastReviewed) : null;
    }
    const updated = await prisma.concept.update({
      where: { id },
      data: update,
    });
    return NextResponse.json({ ok: true, concept: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update concept" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const concept = await checkConceptAccess(id, user.id);
    if (!concept) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.concept.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete concept" }, { status: 500 });
  }
}
