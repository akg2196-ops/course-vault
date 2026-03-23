"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, Library, Search, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Nav() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (t) router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-notion-border bg-notion-bg">
      <div className="container mx-auto flex h-12 items-center gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-medium text-notion-text hover:text-notion-accent transition-colors"
        >
          <BookOpen className="h-5 w-5" />
          Course Vault
        </Link>
        <nav className="hidden md:flex items-center gap-0.5">
          <Link href="/courses">
            <Button variant="ghost" size="sm">
              <LayoutDashboard className="h-4 w-4" />
              My Courses
            </Button>
          </Link>
          <Link href="/library">
            <Button variant="ghost" size="sm">
              <Library className="h-4 w-4" />
              Library
            </Button>
          </Link>
        </nav>
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-notion-text-tertiary" />
            <Input
              type="search"
              placeholder="Search courses, concepts, files…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
