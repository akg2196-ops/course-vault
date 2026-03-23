import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
});

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "dev@coursevault.local" },
    });
    if (!user) {
      return NextResponse.json({ courses: [] });
    }
    const courses = await prisma.course.findMany({
      where: { userId: user.id },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: {
            topics: { orderBy: { order: "asc" } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ courses });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list courses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const body = await req.json();
    const { title, slug } = createSchema.parse(body);
    const course = await prisma.course.create({
      data: {
        title,
        slug: slug ?? slugify(title),
        userId: user.id,
      },
    });
    return NextResponse.json(course);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
