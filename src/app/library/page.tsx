"use client";

import { useEffect, useState } from "react";
import { FileText, Presentation, Image, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Asset = {
  id: string;
  type: string;
  title: string | null;
  mimetype: string;
  path: string;
  createdAt: string;
};

export default function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (courseFilter) params.set("courseId", courseFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (tagFilter) params.set("tag", tagFilter);
    fetch(`/api/library?${params}`)
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setAssets(data) : setAssets([])))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, [courseFilter, typeFilter, tagFilter]);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-notion-text mb-2">
          Library
        </h1>
        <p className="text-notion-text-secondary">
          All files across courses. Filter by course, type, or tag.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-4">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-notion-text-secondary mb-1 block">
                  Course ID
                </label>
                <Input
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  placeholder="Filter by course"
                />
              </div>
              <div>
                <label className="text-xs text-notion-text-secondary mb-1 block">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="flex h-9 w-full rounded-notion border border-notion-border bg-notion-bg-secondary px-3 py-1 text-sm"
                >
                  <option value="">All</option>
                  <option value="READING">Reading</option>
                  <option value="PRESENTATION">Presentation</option>
                  <option value="NOTE">Note</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-notion-text-secondary mb-1 block">
                  Tag
                </label>
                <Input
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  placeholder="Filter by tag"
                />
              </div>
            </CardContent>
          </Card>
        </aside>
        <div className="lg:col-span-3">
          {loading ? (
            <p className="text-notion-text-tertiary">Loading…</p>
          ) : assets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-notion-text-secondary">
                No files match your filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {assets.map((a) => {
                const Icon = icon(a.type);
                const href = `/api/files/${a.path}`;
                return (
                  <Card key={a.id} className="group hover:bg-notion-hover transition-colors">
                    <CardContent className="flex items-center gap-4 py-3">
                      <Icon className="h-5 w-5 text-notion-accent shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{a.title || "Untitled"}</p>
                        <p className="text-xs text-notion-text-secondary">
                          {label(a.type)} · {new Date(a.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <span className="text-sm text-notion-accent hover:underline">
                          Open
                        </span>
                        <ExternalLink className="inline h-3 w-3 ml-1" />
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
