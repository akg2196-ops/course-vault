import { NextRequest, NextResponse } from "next/server";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getSubjectIds(courseId: string): Promise<string[]> {
  const s = await prisma.subject.findMany({
    where: { courseId },
    select: { id: true },
  });
  return s.map((x) => x.id);
}

async function getChapterIds(courseId: string): Promise<string[]> {
  const c = await prisma.chapter.findMany({
    where: { courseId },
    select: { id: true },
  });
  return c.map((x) => x.id);
}

async function getTopicIds(courseId: string): Promise<string[]> {
  const chaps = await getChapterIds(courseId);
  const t = await prisma.topic.findMany({
    where: { chapterId: { in: chaps } },
    select: { id: true },
  });
  return t.map((x) => x.id);
}

async function getConceptIds(courseId: string): Promise<string[]> {
  const tops = await getTopicIds(courseId);
  const c = await prisma.concept.findMany({
    where: { topicId: { in: tops } },
    select: { id: true },
  });
  return c.map((x) => x.id);
}

/** GET /api/library?courseId= & type= & tag= - all assets with filters */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const type = searchParams.get("type");
    const tag = searchParams.get("tag");

    let courseFilter: { attachments: { some: { OR: { nodeType: string; nodeId: string }[] } } } | null = null;
    if (courseId) {
      const [subIds, chapIds, topicIds, conceptIds] = await Promise.all([
        getSubjectIds(courseId),
        getChapterIds(courseId),
        getTopicIds(courseId),
        getConceptIds(courseId),
      ]);
      const or: { nodeType: string; nodeId: string }[] = [
        { nodeType: "COURSE", nodeId: courseId },
        ...subIds.map((id) => ({ nodeType: "SUBJECT" as const, nodeId: id })),
        ...chapIds.map((id) => ({ nodeType: "CHAPTER" as const, nodeId: id })),
        ...topicIds.map((id) => ({ nodeType: "TOPIC" as const, nodeId: id })),
        ...conceptIds.map((id) => ({ nodeType: "CONCEPT" as const, nodeId: id })),
      ];
      courseFilter = { attachments: { some: { OR: or } } };
    }

    const assets = await prisma.asset.findMany({
      where: {
        userId: user.id,
        ...(type && { type }),
        ...(tag && { tags: { contains: tag } }),
        ...(courseFilter && courseFilter),
      },
      include: { attachments: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(assets);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Library failed" }, { status: 500 });
  }
}
