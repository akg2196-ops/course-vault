import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const maxDuration = 60;

const schema = z.object({ conceptId: z.string() });

const ClaudeOutputSchema = z.object({
  summary: z.string().min(1),
  vocabulary: z.array(
    z.object({
      term: z.string().min(1),
      definition: z.string().optional(),
    })
  ),
  examples: z.string().min(1),
  tags: z.array(z.string().min(1)),
  difficulty: z.enum(["easy", "medium", "hard"]),
  studyTips: z.array(z.string().min(1)),
});

type ClaudeOutput = z.infer<typeof ClaudeOutputSchema>;

function isBlank(s: string | null | undefined) {
  return !s || s.trim().length === 0;
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  // If Claude wraps JSON in a code fence, strip it.
  const fenceStripped = trimmed.replace(/^```[a-zA-Z0-9_-]*\s*/g, "").replace(/```$/g, "").trim();
  const start = fenceStripped.indexOf("{");
  const end = fenceStripped.lastIndexOf("}");
  if (start >= 0 && end > start) return fenceStripped.slice(start, end + 1);
  return fenceStripped;
}

/**
 * Generate concept notes via Claude (Anthropic).
 * - If ANTHROPIC_API_KEY is missing: use placeholder generator and save as AI note.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const body = await req.json();
    const { conceptId } = schema.parse(body);

    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        topic: {
          include: {
            chapter: { include: { course: true } },
          },
        },
      },
    });
    if (!concept) return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    const course = await prisma.course.findFirst({
      where: { id: concept.topic.chapter.courseId, userId: user.id },
    });
    if (!course) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // If Anthropic isn't configured, fall back to placeholder notes so MVP still works.
    const apiKey = process.env.ANTHROPIC_API_KEY;

    let generated: ClaudeOutput | null = null;
    if (apiKey) {
      const coursePath = [
        concept.topic.chapter.course.title,
        concept.topic.chapter.title,
        concept.topic.title,
      ];

      const prompt = [
        `You are generating study notes for a single node in a course hierarchy for Course Vault.`,
        ``,
        `Do NOT generate flashcards, quizzes, or multiple-choice content.`,
        `Output ONLY valid JSON that matches the schema exactly; no extra keys; no code fences.`,
        ``,
        `Return JSON object schema:`,
        `{
  "summary": string,
  "vocabulary": Array<{ "term": string, "definition"?: string }>,
  "examples": string,
  "tags": string[],
  "difficulty": "easy" | "medium" | "hard",
  "studyTips": string[]
}`,
        ``,
        `Course path context: ${coursePath.join(" > ")}`,
        `Concept title: ${concept.title}`,
        ``,
        `Existing concept fields (may be empty):`,
        `- Summary: ${concept.summary ?? "(none)"}`,
        `- Vocabulary (JSON string): ${concept.vocabulary ?? "(none)"}`,
        `- Examples: ${concept.examples ?? "(none)"}`,
        `- Tags (JSON string): ${concept.tags ?? "(none)"}`,
        `- Difficulty: ${concept.difficulty ?? "(none)"}`,
        ``,
        `Rules:`,
        `- If an existing field is non-empty, reuse it (do not overwrite).`,
        `- If a field is empty, generate high-quality content that fits the concept and the course context.`,
        `- Vocabulary terms should be key terms explicitly relevant to the concept.`,
        `- Examples should be concrete and educational.`,
        `Be concise. Keep all text fields under 100 words each.`,
      ].join("\n");

      const client = new Anthropic();

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      });

      let raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
      console.log('=== RAW CLAUDE RESPONSE LENGTH:', raw.length)
      console.log('=== RAW CLAUDE RESPONSE (first 500 chars):', raw.substring(0, 500))
      console.log('=== RAW CLAUDE RESPONSE (around position 3220):', raw.substring(3150, 3300))
      raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed = JSON.parse(raw)
      generated = ClaudeOutputSchema.parse(parsed)
    }

    let updatedConcept: Awaited<ReturnType<typeof prisma.concept.update>> | null = null;
    if (generated) {
      // Only fill Concept fields when they are currently blank.
      const nextSummary = isBlank(concept.summary) ? generated.summary : concept.summary;
      const nextVocabulary = isBlank(concept.vocabulary)
        ? generated.vocabulary.length
          ? JSON.stringify(generated.vocabulary)
          : null
        : concept.vocabulary;
      const nextExamples = isBlank(concept.examples) ? generated.examples : concept.examples;
      const nextTags = isBlank(concept.tags)
        ? generated.tags.length
          ? JSON.stringify(generated.tags)
          : null
        : concept.tags;
      const nextDifficulty = isBlank(concept.difficulty) ? generated.difficulty : concept.difficulty;

      updatedConcept = await prisma.concept.update({
        where: { id: concept.id },
        data: {
          summary: nextSummary ?? null,
          vocabulary: nextVocabulary ?? null,
          examples: nextExamples ?? null,
          tags: nextTags ?? null,
          difficulty: nextDifficulty ?? null,
        },
      });
    }

    const content = generated
      ? buildAiNoteContent(concept.title, generated)
      : placeholderGenerateNotes(concept);

    const note = await prisma.note.create({
      data: {
        content,
        source: "AI",
        userId: user.id,
        conceptId: concept.id,
      },
    });
    return NextResponse.json({ note, concept: updatedConcept });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error("[generate-notes error]", err);
    return NextResponse.json({ error: "Generate notes failed" }, { status: 500 });
  }
}

function placeholderGenerateNotes(concept: {
  title: string;
  summary: string | null;
  vocabulary: string | null;
  examples: string | null;
}): string {
  const lines: string[] = [
    `# AI-generated notes: ${concept.title}`,
    "",
    "> Placeholder generator (no API key). Replace with real AI integration.",
    "",
  ];
  if (concept.summary) {
    lines.push("## Summary", "", concept.summary, "");
  }
  if (concept.vocabulary) {
    try {
      const v = JSON.parse(concept.vocabulary) as { term?: string; definition?: string }[];
      if (Array.isArray(v) && v.length) {
        lines.push("## Vocabulary", "");
        v.forEach((e) => {
          lines.push(`- **${e.term ?? "?"}**: ${e.definition ?? ""}`);
        });
        lines.push("");
      }
    } catch {
      lines.push("## Vocabulary", "", concept.vocabulary, "");
    }
  }
  if (concept.examples) {
    lines.push("## Examples", "", concept.examples, "");
  }
  return lines.join("\n");
}

function buildAiNoteContent(title: string, data: ClaudeOutput): string {
  const vocabLines = data.vocabulary
    .map((v) => `- **${v.term}**: ${v.definition ?? ""}`.trimEnd())
    .join("\n");

  const tipsLines = data.studyTips.map((t) => `- ${t}`).join("\n");

  return [
    `# AI-generated notes: ${title}`,
    ``,
    `## Summary`,
    ``,
    data.summary,
    ``,
    `## Key Vocabulary`,
    ``,
    vocabLines || "_None_",
    ``,
    `## Examples`,
    ``,
    data.examples,
    ``,
    `## Study Tips`,
    ``,
    tipsLines || "_None_",
    ``,
  ].join("\n");
}
