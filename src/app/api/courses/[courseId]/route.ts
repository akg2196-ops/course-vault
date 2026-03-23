import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { courseId } = await params;
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: user.id },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: {
                concepts: { orderBy: { order: "asc" } },
              },
            },
          },
        },
      },
    });
    if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(course);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { courseId } = await params;
    const exists = await prisma.course.findFirst({
      where: { id: courseId, userId: user.id },
    });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await req.json();
    const data = updateSchema.parse(body);
    const update: { title?: string; slug?: string } = {};
    if (data.title != null) update.title = data.title;
    if (data.slug != null) update.slug = data.slug;
    if (data.title != null && data.slug == null) update.slug = slugify(data.title);
    const course = await prisma.course.update({
      where: { id: courseId },
      data: update,
    });
    return NextResponse.json(course);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { courseId } = await params;
    const exists = await prisma.course.findFirst({
      where: { id: courseId, userId: user.id },
    });
    if (!exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    await prisma.course.delete({ where: { id: courseId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
