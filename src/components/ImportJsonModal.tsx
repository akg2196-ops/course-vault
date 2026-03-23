"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  onSuccess: () => void;
};

const example = `{
  "subjects": [
    {
      "title": "Unit 1",
      "order": 0,
      "chapters": [
        {
          "title": "Chapter 1",
          "order": 0,
          "topics": [
            {
              "title": "Topic 1.1",
              "order": 0,
              "concepts": [
                {
                  "title": "Concept A",
                  "summary": "Optional summary",
                  "vocabulary": "[{\\"term\\":\\"x\\",\\"definition\\":\\"y\\"}]",
                  "tags": "[\\"tag1\\"]"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

export function ImportJsonModal({ open, onOpenChange, courseId, onSuccess }: Props) {
  const [json, setJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setJson("");
    setError("");
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("Invalid JSON.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>Import course map from JSON</DialogTitle>
          <p className="text-sm text-notion-text-secondary">
            Paste JSON with a <code className="bg-notion-bg-secondary px-1 rounded">subjects</code> array.
            Each subject can have <code className="bg-notion-bg-secondary px-1 rounded">chapters</code>, etc.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder={example}
              rows={14}
              className="font-mono text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setJson(example)}
            className="text-xs text-notion-accent hover:underline"
          >
            Use example
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
