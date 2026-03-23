"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Node =
  | { type: "course"; id: string; title: string }
  | { type: "chapter"; id: string; title: string; payload?: unknown }
  | { type: "topic"; id: string; title: string; payload: { chapterId: string } }
  | { type: "concept"; id: string; title: string; payload: { topicId: string } };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parent: Node | null;
  courseId: string;
  onSuccess: () => void;
};

export function AddNodeModal({
  open,
  onOpenChange,
  parent,
  courseId,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [vocabulary, setVocabulary] = useState("");
  const [examples, setExamples] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setSummary("");
    setVocabulary("");
    setExamples("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!parent) return;
    setLoading(true);
    try {
      let url: string;
      let body: Record<string, unknown>;
      if (parent.type === "course") {
        url = "/api/chapters";
        body = { courseId: parent.id, title: title.trim() };
      } else if (parent.type === "chapter") {
        url = "/api/topics";
        body = { chapterId: parent.id, title: title.trim() };
      } else {
        url = "/api/concepts";
        body = {
          topicId: parent.id,
          title: title.trim(),
          summary: summary.trim() || undefined,
          vocabulary: vocabulary.trim() || undefined,
          examples: examples.trim() || undefined,
        };
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || "Failed");
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!parent) return null;

  const childLabel =
    parent.type === "course"
      ? "Chapter"
      : parent.type === "chapter"
        ? "Topic"
        : "Concept";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>Add {childLabel}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="add-title">Title</Label>
            <Input
              id="add-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${childLabel} name`}
              className="mt-2"
            />
          </div>
          {parent.type === "topic" && (
            <>
              <div>
                <Label htmlFor="add-summary">Summary (optional)</Label>
                <Textarea
                  id="add-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="add-vocab">Vocabulary JSON (optional)</Label>
                <Textarea
                  id="add-vocab"
                  value={vocabulary}
                  onChange={(e) => setVocabulary(e.target.value)}
                  placeholder='[{"term":"...","definition":"..."}]'
                  rows={2}
                  className="mt-2 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="add-examples">Examples (optional)</Label>
                <Textarea
                  id="add-examples"
                  value={examples}
                  onChange={(e) => setExamples(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
