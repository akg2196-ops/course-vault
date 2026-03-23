import { NextRequest, NextResponse } from "next/server";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/search?q=... - global search across map + assets + tags */
export async function GET(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    if (!q) {
      return NextResponse.json({ concepts: [], files: [] });
    }
    const like = `%${q}%`;

    const [concepts, assets] = await Promise.all([
      prisma.concept.findMany({
        where: {
          topic: {
            chapter: {
              course: { userId: user.id },
            },
          },
          OR: [
            { title: { contains: q } },
            { summary: { contains: q } },
            { vocabulary: { contains: q } },
            { examples: { contains: q } },
            { tags: { contains: q } },
          ],
        },
        include: {
          topic: {
            include: {
              chapter: {
                include: {
                  course: true,
                },
              },
            },
          },
        },
        take: 50,
      }),
      prisma.asset.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: q } },
            { tags: { contains: q } },
          ],
        },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      concepts: concepts.map((c) => ({
        id: c.id,
        type: "concept" as const,
        title: c.title,
        summary: c.summary,
        courseId: c.topic.chapter.courseId,
        course: c.topic.chapter.course.title,
        path: [
          c.topic.chapter.course.title,
          c.topic.chapter.title,
          c.topic.title,
        ],
      })),
      files: assets.map((a) => ({
        id: a.id,
        type: "file" as const,
        title: a.title,
        assetType: a.type,
        mimetype: a.mimetype,
        path: a.path,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
