import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().trim().min(1),
  syllabusText: z.string().trim().min(50),
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Convert whitespace to hyphens
    .replace(/\s+/g, "-")
    // Strip special characters (keep letters, numbers, and hyphens)
    .replace(/[^a-z0-9-]/g, "")
    // Collapse multiple hyphens
    .replace(/-+/g, "-")
    // Trim leading/trailing hyphens
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, syllabusText } = createSchema.parse(body);

    const slug = generateSlug(title);

    const devUser = await prisma.user.findUnique({
      where: { email: "dev@coursevault.local" },
    });

    if (!devUser) throw new Error("Dev user not found");

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        syllabusText,
        userId: devUser.id,
      },
    });

    return NextResponse.json({ ok: true, courseId: course.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create course" },
      { status: 500 }
    );
  }
}

