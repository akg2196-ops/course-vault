"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type AssetType = "READING" | "PRESENTATION" | "NOTE";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nodeType: string | null;
  nodeId: string | null;
  onSuccess?: () => void;
};

const ASSET_OPTIONS: { value: AssetType; label: string }[] = [
  { value: "READING", label: "Reading (PDF, DOCX)" },
  { value: "PRESENTATION", label: "Presentation (PPTX, PDF)" },
  { value: "NOTE", label: "Note (image, PDF)" },
];

export function UploadModal({
  open,
  onOpenChange,
  nodeType,
  nodeId,
  onSuccess,
}: Props) {
  const [type, setType] = useState<AssetType>("READING");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setType("READING");
    setTitle("");
    setFile(null);
    setError("");
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a file.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("type", type);
      if (title.trim()) form.set("title", title.trim());
      if (nodeType && nodeId) {
        form.set("nodeType", nodeType);
        form.set("nodeId", nodeId);
      }
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      handleClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onClose={handleClose}
      >
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ASSET_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setType(o.value)}
                  className={`rounded-notion border px-3 py-1.5 text-sm transition-colors ${
                    type === o.value
                      ? "border-notion-accent bg-notion-accent/20 text-notion-accent"
                      : "border-notion-border hover:bg-notion-hover"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="upload-title">Title (optional)</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Override file name"
              className="mt-2"
            />
          </div>
          <div>
            <Label>File</Label>
            <div
              className="mt-2 flex items-center gap-2 p-4 rounded-notion border border-notion-border bg-notion-bg-secondary"
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="h-5 w-5 text-notion-text-tertiary" />
              <span className="text-sm text-notion-text-secondary truncate flex-1">
                {file?.name || "Click to select"}
              </span>
            </div>
          </div>
          {nodeType && nodeId && (
            <p className="text-xs text-notion-text-tertiary">
              Will attach to selected node.
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
