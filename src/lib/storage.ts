/**
 * Storage service layer for file uploads.
 * Local filesystem in dev (./uploads); abstract interface for S3 later.
 */

import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type AssetType = "READING" | "PRESENTATION" | "NOTE";

function ensureUploadDir(): string {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  return UPLOAD_DIR;
}

function extFromMimetype(mimetype: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return map[mimetype] || "bin";
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  mimetype: string;
}

/** Local filesystem implementation. Stored path = filename (uuid.ext) for S3 portability. */
export async function uploadFile(
  buffer: Buffer,
  mimetype: string,
  originalName: string,
  _assetType: AssetType
): Promise<UploadResult> {
  ensureUploadDir();
  const ext = extFromMimetype(mimetype) || path.extname(originalName).slice(1) || "bin";
  const id = uuidv4();
  const filename = `${id}.${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(fullPath, buffer);
  const url = `/api/files/${filename}`;
  return {
    path: filename,
    url,
    size: buffer.length,
    mimetype,
  };
}

/** Resolve stored path (filename) to absolute local path for serving */
export function getFilePath(storedPath: string): string | null {
  const base = storedPath ? path.basename(storedPath) : "";
  if (!base) return null;
  const joined = path.join(UPLOAD_DIR, base);
  return fs.existsSync(joined) ? joined : null;
}

/** Public URL for an asset (local: /api/files/...) */
export function getFileUrl(storedPath: string): string {
  const base = path.basename(storedPath);
  return `${BASE_URL}/api/files/${base}`;
}

/** Delete file from storage */
export async function deleteFile(storedPath: string): Promise<void> {
  const fp = getFilePath(storedPath);
  if (fp) {
    try {
      fs.unlinkSync(fp);
    } catch {
      // ignore
    }
  }
}
