import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  content: z.string().min(1),
  source: z.enum(["AI", "MANUAL"]),
  conceptId: z.string().optional(),
  nodeType: z.string().optional(),
  nodeId: z.string().optional(),
});

/** GET ?conceptId= or ?nodeType= & nodeId= */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const { searchParams } = new URL(req.url);
    const conceptId = searchParams.get("conceptId");
    const nodeType = searchParams.get("nodeType");
    const nodeId = searchParams.get("nodeId");
    if (conceptId) {
      const notes = await prisma.note.findMany({
        where: { userId: user.id, conceptId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(notes);
    }
    if (nodeType && nodeId) {
      const notes = await prisma.note.findMany({
        where: { userId: user.id, nodeType, nodeId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(notes);
    }
    return NextResponse.json({ error: "Provide conceptId or nodeType+nodeId" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list notes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const body = await req.json();
    const data = createSchema.parse(body);
    if (data.conceptId) {
      const concept = await prisma.concept.findUnique({
        where: { id: data.conceptId },
        include: {
          topic: {
            include: {
                chapter: { include: { course: true } },
            },
          },
        },
      });
      if (!concept) return NextResponse.json({ error: "Concept not found" }, { status: 404 });
      if (concept.topic.chapter.course.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const note = await prisma.note.create({
      data: {
        content: data.content,
        source: data.source,
        userId: user.id,
        conceptId: data.conceptId ?? null,
        nodeType: data.nodeType ?? null,
        nodeId: data.nodeId ?? null,
      },
    });
    return NextResponse.json(note);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
