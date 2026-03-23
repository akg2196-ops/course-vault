import { NextRequest, NextResponse } from "next/server";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** DELETE - detach asset from node */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateMockUser();
    const { id } = await params;
    const att = await prisma.attachment.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!att || att.asset.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.attachment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to detach" }, { status: 500 });
  }
}
