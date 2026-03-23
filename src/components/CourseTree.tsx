"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  CircleDot,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Chapter = {
  id: string;
  title: string;
  order: number;
  topics: Topic[];
};
type Topic = {
  id: string;
  title: string;
  order: number;
  concepts: Concept[];
};
type Concept = {
  id: string;
  title: string;
  order: number;
};

type Node =
  | { type: "chapter"; id: string; title: string; payload: Chapter }
  | { type: "topic"; id: string; title: string; payload: Topic }
  | { type: "concept"; id: string; title: string; payload: Concept };

type TreeProps = {
  chapters: Chapter[];
  selected: { type: string; id: string } | null;
  onSelect: (node: Node) => void;
  onAddChild?: (parent: Node) => void;
};

function TreeRow({
  node,
  selected,
  onSelect,
  onAddChild,
  depth,
  expanded,
  onToggle,
  isLast,
}: {
  node: Node;
  selected: { type: string; id: string } | null;
  onSelect: (n: Node) => void;
  onAddChild?: (parent: Node) => void;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const isSelected =
    selected?.type === node.type && selected?.id === node.id;
  const hasChildren =
    (node.type === "chapter" && node.payload.topics?.length) ||
    (node.type === "topic" && node.payload.concepts?.length);

  const icon =
    node.type === "chapter" ? FileText : node.type === "topic" ? CircleDot : BookOpen;

  const Icon = icon;

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "group flex items-center gap-1 py-1.5 px-2 rounded-notion cursor-pointer",
          "hover:bg-notion-hover",
          isSelected && "bg-notion-hover border-l-2 border-notion-accent"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        <button
          type="button"
          className="p-0.5 rounded hover:bg-notion-hover"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-notion-text-tertiary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-notion-text-tertiary" />
            )
          ) : (
            <span className="w-4 inline-block" />
          )}
        </button>
        <Icon className="h-4 w-4 text-notion-accent shrink-0" />
        <span className="truncate text-sm flex-1">{node.title}</span>
        {onAddChild && node.type !== "concept" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function flatten(
  chapters: Chapter[],
  expanded: Set<string>,
  depth: number,
  acc: { node: Node; depth: number; expanded: boolean; hasChildren: boolean }[]
) {
  for (const ch of chapters) {
    const chk = `chapter-${ch.id}`;
    const chexp = expanded.has(chk);
    const chHas = (ch.topics?.length ?? 0) > 0;
    acc.push({
      node: { type: "chapter", id: ch.id, title: ch.title, payload: ch },
      depth,
      expanded: chexp,
      hasChildren: chHas,
    });
    if (chexp && ch.topics) {
      for (const t of ch.topics) {
        const tk = `topic-${t.id}`;
        const texp = expanded.has(tk);
        const tHas = (t.concepts?.length ?? 0) > 0;
        acc.push({
          node: { type: "topic", id: t.id, title: t.title, payload: t },
          depth: depth + 1,
          expanded: texp,
          hasChildren: tHas,
        });
        if (texp && t.concepts) {
          for (const c of t.concepts) {
            acc.push({
              node: { type: "concept", id: c.id, title: c.title, payload: c },
              depth: depth + 2,
              expanded: false,
              hasChildren: false,
            });
          }
        }
      }
    }
  }
  return acc;
}

export function CourseTree({
  chapters,
  selected,
  onSelect,
  onAddChild,
}: TreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    chapters.forEach((ch) => s.add(`chapter-${ch.id}`));
    return s;
  });

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const rows = flatten(chapters, expanded, 0, []);

  return (
    <div className="overflow-y-auto py-2">
      {rows.map((r, i) => (
        <TreeRow
          key={`${r.node.type}-${r.node.id}`}
          node={r.node}
          selected={selected}
          onSelect={onSelect}
          onAddChild={onAddChild}
          depth={r.depth}
          expanded={r.expanded}
          onToggle={() => {
            const k =
              r.node.type === "chapter"
                ? `chapter-${r.node.id}`
                : r.node.type === "topic"
                  ? `topic-${r.node.id}`
                  : "";
            if (k) toggle(k);
          }}
          isLast={i === rows.length - 1}
        />
      ))}
    </div>
  );
}
