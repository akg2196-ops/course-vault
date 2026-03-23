import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  courseId: z.string(),
  title: z.string().min(1),
  order: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const body = await req.json();
    const { courseId, title, order } = createSchema.parse(body);
    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: user.id },
      select: { id: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const count = await prisma.chapter.count({ where: { courseId } });
    const chapter = await prisma.chapter.create({
      data: {
        courseId,
        title,
        order: order ?? count,
      },
    });
    return NextResponse.json({ chapter });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create chapter" }, { status: 500 });
  }
}
