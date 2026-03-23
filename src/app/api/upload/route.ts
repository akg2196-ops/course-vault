import { NextRequest, NextResponse } from "next/server";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFile, type AssetType } from "@/lib/storage";
import { NODE_TYPES } from "@/lib/types";

const ASSET_TYPES = ["READING", "PRESENTATION", "NOTE"] as const;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "READING";
    const nodeType = formData.get("nodeType") as string | null;
    const nodeId = formData.get("nodeId") as string | null;
    const title = (formData.get("title") as string) || undefined;
    const author = (formData.get("author") as string) || undefined;

    if (!file || !file.size) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ASSET_TYPES.includes(type as (typeof ASSET_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }
    if (nodeType && !NODE_TYPES.includes(nodeType as (typeof NODE_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid nodeType" }, { status: 400 });
    }
    if ((nodeType && !nodeId) || (!nodeType && nodeId)) {
      return NextResponse.json({ error: "Provide both nodeType and nodeId or neither" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mimetype = file.type || "application/octet-stream";
    const result = await uploadFile(buf, mimetype, file.name, type as AssetType);

    const asset = await prisma.asset.create({
      data: {
        type,
        mimetype: result.mimetype,
        size: result.size,
        path: result.path,
        title: title || file.name,
        author: author || null,
        source: "UPLOAD",
        userId: user.id,
      },
    });

    if (nodeType && nodeId) {
      await prisma.attachment.create({
        data: { assetId: asset.id, nodeType, nodeId },
      });
    }

    const withAttachments = await prisma.asset.findUnique({
      where: { id: asset.id },
      include: { attachments: true },
    });
    return NextResponse.json({
      ...withAttachments,
      url: result.url,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
