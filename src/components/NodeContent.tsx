"use client";

import { useState, useEffect } from "react";
import { Sparkles, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Concept = {
  id: string;
  title: string;
  summary: string | null;
  vocabulary: string | null;
  examples: string | null;
  tags: string | null;
  difficulty: string | null;
  topicId: string;
  topic: { title: string };
};

type Node =
  | { type: "subject"; id: string; title: string }
  | { type: "chapter"; id: string; title: string }
  | { type: "topic"; id: string; title: string }
  | { type: "concept"; id: string; title: string; payload: Concept };

type Props = {
  node: Node | null;
  courseId: string;
  onGenerateNotes: (conceptId: string) => void;
  onRefresh: () => void;
};

export function NodeContent({ node, courseId, onGenerateNotes, onRefresh }: Props) {
  const concept = node?.type === "concept" ? (node as { payload: Concept }).payload : null;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    vocabulary: "",
    examples: "",
    tags: "",
    difficulty: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!concept) {
      setEditing(false);
      return;
    }
    setForm({
      title: concept.title,
      summary: concept.summary ?? "",
      vocabulary: concept.vocabulary ?? "",
      examples: concept.examples ?? "",
      tags: concept.tags ?? "",
      difficulty: concept.difficulty ?? "",
    });
  }, [concept?.id]);

  const handleSave = async () => {
    if (!concept) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/concepts/${concept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || undefined,
          summary: form.summary || null,
          vocabulary: form.vocabulary || null,
          examples: form.examples || null,
          tags: form.tags || null,
          difficulty: form.difficulty || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditing(false);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-notion-text-secondary text-sm p-8">
        <p>Select a node from the course map.</p>
      </div>
    );
  }

  if (node.type !== "concept") {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{node.title}</CardTitle>
            <p className="text-sm text-notion-text-secondary">
              {node.type.charAt(0).toUpperCase() + node.type.slice(1).toLowerCase()}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-notion-text-secondary">
              Add chapters, topics, and Concepts from the tree. Select a Concept to view
              or edit details.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            {editing ? (
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="font-serif text-lg"
              />
            ) : (
              <CardTitle className="text-lg">{concept?.title ?? node.title}</CardTitle>
            )}
            {concept?.topic && (
              <p className="text-xs text-notion-text-secondary">
                Topic: {typeof concept.topic === "object" ? concept.topic.title : ""}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-3 w-3" />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (concept) onGenerateNotes(concept.id);
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  Generate notes
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div>
                <Label>Summary</Label>
                <Textarea
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={4}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Vocabulary (JSON array of &#123;&quot;term&quot;: &quot;...&quot;, &quot;definition&quot;: &quot;...&quot;&#125;)</Label>
                <Textarea
                  value={form.vocabulary}
                  onChange={(e) => setForm((f) => ({ ...f, vocabulary: e.target.value }))}
                  rows={3}
                  className="mt-2 font-mono text-sm"
                />
              </div>
              <div>
                <Label>Examples (markdown)</Label>
                <Textarea
                  value={form.examples}
                  onChange={(e) => setForm((f) => ({ ...f, examples: e.target.value }))}
                  rows={4}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Tags (JSON array, e.g. [&quot;tag1&quot;, &quot;tag2&quot;])</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  className="mt-2 font-mono"
                />
              </div>
              <div>
                <Label>Difficulty (easy | medium | hard)</Label>
                <Input
                  value={form.difficulty}
                  onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </>
          ) : (
            <>
              {concept?.summary && (
                <div>
                  <h4 className="text-sm font-medium text-notion-text mb-1">Summary</h4>
                  <p className="text-sm text-notion-text-secondary whitespace-pre-wrap">
                    {concept.summary}
                  </p>
                </div>
              )}
              {concept?.vocabulary && (
                <div>
                  <h4 className="text-sm font-medium text-notion-text mb-1">Vocabulary</h4>
                  <div className="text-sm text-notion-text-secondary">
                    {(() => {
                      try {
                        const v = JSON.parse(concept.vocabulary) as {
                          term?: string;
                          definition?: string;
                        }[];
                        if (!Array.isArray(v)) return <pre>{concept.vocabulary}</pre>;
                        return (
                          <ul className="list-disc list-inside space-y-1">
                            {v.map((e, i) => (
                              <li key={i}>
                                <strong>{e.term ?? "?"}</strong>: {e.definition ?? ""}
                              </li>
                            ))}
                          </ul>
                        );
                      } catch {
                        return <pre className="whitespace-pre-wrap">{concept.vocabulary}</pre>;
                      }
                    })()}
                  </div>
                </div>
              )}
              {concept?.examples && (
                <div>
                  <h4 className="text-sm font-medium text-notion-text mb-1">Examples</h4>
                  <div className="text-sm text-notion-text-secondary whitespace-pre-wrap">
                    {concept.examples}
                  </div>
                </div>
              )}
              {concept?.tags && (
                <div>
                  <h4 className="text-sm font-medium text-notion-text mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      try {
                        const t = JSON.parse(concept.tags) as string[];
                        return Array.isArray(t)
                          ? t.map((tag, i) => (
                              <span
                                key={i}
                                className="rounded-full bg-notion-bg-secondary px-2 py-0.5 text-xs"
                              >
                                {tag}
                              </span>
                            ))
                          : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}
              {concept?.difficulty && (
                <p className="text-sm text-notion-text-secondary">
                  Difficulty: {concept.difficulty}
                </p>
              )}
              {!concept?.summary &&
                !concept?.vocabulary &&
                !concept?.examples &&
                !concept?.tags &&
                !concept?.difficulty && (
                  <p className="text-sm text-notion-text-secondary">
                    No details yet. Click Edit to add summary, vocabulary, and examples.
                  </p>
                )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
