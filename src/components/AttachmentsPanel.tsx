"use client";

import { useEffect, useState } from "react";
import { FileText, Presentation, Image, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Attachment = {
  id: string;
  assetId: string;
  nodeType: string;
  nodeId: string;
  asset: {
    id: string;
    type: string;
    title: string | null;
    mimetype: string;
    path: string;
  };
};

type Props = {
  nodeType: string | null;
  nodeId: string | null;
  onUploadClick: () => void;
  refreshTrigger?: number;
};

export function AttachmentsPanel({ nodeType, nodeId, onUploadClick, refreshTrigger }: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nodeType || !nodeId) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch(`/api/attachments?nodeType=${nodeType}&nodeId=${nodeId}`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setItems(data) : setItems([])))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [nodeType, nodeId, refreshTrigger]);

  const detach = async (attachmentId: string) => {
    try {
      await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch {
      // ignore
    }
  };

  const icon = (type: string) => {
    if (type === "PRESENTATION") return Presentation;
    if (type === "NOTE") return Image;
    return FileText;
  };

  const label = (type: string) => {
    if (type === "READING") return "Reading";
    if (type === "PRESENTATION") return "Presentation";
    return "Note";
  };

  if (!nodeType || !nodeId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-notion-text-secondary text-sm p-4">
        <FileText className="h-10 w-10 mb-2 opacity-50" />
        <p>Select a node to view attachments.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-notion-text">Attachments</h3>
        <Button size="sm" onClick={onUploadClick}>
          Upload
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-notion-text-tertiary">Loading…</p>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-notion-text-secondary text-sm">
          <FileText className="h-10 w-10 mb-2 opacity-50" />
          <p className="mb-2">No attachments yet.</p>
          <Button variant="secondary" size="sm" onClick={onUploadClick}>
            Upload file
          </Button>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto">
          {items.map((a) => {
            const Icon = icon(a.asset.type);
            const href = `/api/files/${a.asset.path}`;
            return (
              <li
                key={a.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-notion bg-notion-bg-secondary",
                  "group"
                )}
              >
                <Icon className="h-4 w-4 text-notion-accent shrink-0" />
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 text-sm truncate hover:text-notion-accent"
                >
                  {a.asset.title || "Untitled"}
                </a>
                <span className="text-xs text-notion-text-tertiary shrink-0">
                  {label(a.asset.type)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-400"
                    onClick={() => detach(a.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
