"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon, BookOpen, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ConceptHit = {
  id: string;
  type: "concept";
  title: string;
  summary: string | null;
  courseId: string;
  course: string;
  path: string[];
};

type FileHit = {
  id: string;
  type: "file";
  title: string;
  assetType: string;
  mimetype: string;
  path: string;
};

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(qParam);
  const [results, setResults] = useState<{
    concepts: ConceptHit[];
    files: FileHit[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    const q = (qParam || "").trim();
    if (!q) {
      setResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) =>
        setResults({
          concepts: data.concepts ?? [],
          files: data.files ?? [],
        })
      )
      .catch(() => setResults({ concepts: [], files: [] }))
      .finally(() => setLoading(false));
  }, [qParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = query.trim();
    if (t) router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl font-medium text-notion-text mb-2">
          Search
        </h1>
        <p className="text-notion-text-secondary mb-6">
          Find concepts, files, and tags across all courses.
        </p>
        <form onSubmit={handleSubmit} className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-notion-text-tertiary" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="pl-10 pr-4"
          />
          <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2" size="sm">
            Search
          </Button>
        </form>
      </div>
      {loading && (
        <p className="text-center text-notion-text-tertiary">Searching…</p>
      )}
      {!loading && results && (
        <div className="space-y-8 max-w-3xl mx-auto">
          {results.concepts.length > 0 && (
            <section>
              <h2 className="font-medium text-notion-text mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Concepts
              </h2>
              <div className="space-y-2">
                {results.concepts.map((c) => (
                  <Link key={c.id} href={`/courses/${c.courseId}`}>
                    <Card className="hover:bg-notion-hover transition-colors cursor-pointer">
                      <CardContent className="py-3">
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-notion-text-secondary">
                          {c.course} → {c.path.join(" → ")}
                        </p>
                        {c.summary && (
                          <p className="text-sm text-notion-text-secondary mt-1 line-clamp-2">
                            {c.summary}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.files.length > 0 && (
            <section>
              <h2 className="font-medium text-notion-text mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Files
              </h2>
              <div className="space-y-2">
                {results.files.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/files/${f.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Card className="hover:bg-notion-hover transition-colors">
                      <CardContent className="py-3">
                        <p className="font-medium">{f.title}</p>
                        <p className="text-xs text-notion-text-secondary">
                          {f.assetType} · {f.mimetype}
                        </p>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </section>
          )}
          {results.concepts.length === 0 && results.files.length === 0 && (qParam || "").trim() && (
            <p className="text-center text-notion-text-tertiary">No results.</p>
          )}
        </div>
      )}
      {!loading && !results && !(qParam || "").trim() && (
        <p className="text-center text-notion-text-tertiary">
          Enter a search term above.
        </p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <p className="text-notion-text-tertiary">Loading…</p>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
