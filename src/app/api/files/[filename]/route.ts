import { NextRequest, NextResponse } from "next/server";
import { getFilePath } from "@/lib/storage";
import fs from "fs";

const MIMETYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }
  const fp = getFilePath(filename);
  if (!fp || !fs.existsSync(fp)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimetype = MIMETYPES[ext] || "application/octet-stream";
  const buf = fs.readFileSync(fp);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": mimetype,
      "Content-Length": String(buf.length),
    },
  });
}
