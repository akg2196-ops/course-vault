import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  assetId: z.string(),
  nodeType: z.enum(["COURSE", "SUBJECT", "CHAPTER", "TOPIC", "CONCEPT"]),
  nodeId: z.string(),
});

/** POST - attach asset to node */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const body = await req.json();
    const { assetId, nodeType, nodeId } = createSchema.parse(body);
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId: user.id },
    });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    const existing = await prisma.attachment.findFirst({
      where: { assetId, nodeType, nodeId },
    });
    if (existing) return NextResponse.json(existing);
    const att = await prisma.attachment.create({
      data: { assetId, nodeType, nodeId },
      include: { asset: true },
    });
    return NextResponse.json(att);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to attach" }, { status: 500 });
  }
}

/** GET ?nodeType= & nodeId= - list attachments for a node */
export async function GET(req: NextRequest) {
  try {
    await getOrCreateMockUser();
    const { searchParams } = new URL(req.url);
    const nodeType = searchParams.get("nodeType");
    const nodeId = searchParams.get("nodeId");
    if (!nodeType || !nodeId) {
      return NextResponse.json({ error: "nodeType and nodeId required" }, { status: 400 });
    }
    const list = await prisma.attachment.findMany({
      where: { nodeType, nodeId },
      include: { asset: true },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list attachments" }, { status: 500 });
  }
}
