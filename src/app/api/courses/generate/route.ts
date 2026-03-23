import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

const GenerateSchema = z.object({
  title: z.string().min(1),
  syllabusText: z.string().min(1),
});

const ChapterSchema = z.object({
  title: z.string().min(1),
  topics: z
    .array(
      z.object({
        title: z.string().min(1),
        concepts: z.array(z.object({ title: z.string().min(1) })).min(1).max(10),
      })
    )
    .min(1)
    .max(10),
});

const CourseMapSchema = z.object({
  chapters: z.array(ChapterSchema).min(1).max(12),
});

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenceStripped = trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/g, "")
    .replace(/```$/g, "")
    .trim();
  const start = fenceStripped.indexOf("{");
  const end = fenceStripped.lastIndexOf("}");
  if (start >= 0 && end > start) return fenceStripped.slice(start, end + 1);
  return fenceStripped;
}

async function callClaudeToGenerateMap(params: {
  apiKey: string;
  syllabusText: string;
  courseTitle: string;
}) {
  const { apiKey, syllabusText, courseTitle } = params;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const anthropicVersion = process.env.ANTHROPIC_VERSION || "2023-06-01";

  const prompt = [
    "You are reorganizing a syllabus into a hierarchical study map for Course Vault.",
    "",
    "Goal: generate a JSON structure of course chapters -> topics -> Concepts.",
    "",
    "IMPORTANT OUTPUT RULES:",
    "- Do NOT generate flashcards, quizzes, or multiple-choice answers.",
    "- Output ONLY valid JSON. No code fences, no extra keys, no explanation.",
    "",
    "Return JSON schema exactly:",
    `{
  "chapters": [
    {
      "title": string,
      "topics": [
        {
          "title": string,
          "concepts": [{ "title": string }]
        }
      ]
    }
  ]
}`,
    "",
    "Constraints (keep it manageable):",
    "- 5 to 8 chapters",
    "- each chapter: 3 to 6 topics",
    "- each topic: 3 to 7 Concepts",
    "- Titles should be concise and specific (avoid generic filler).",
    "",
    `Course title: ${courseTitle}`,
    "",
    "Syllabus text:",
    syllabusText,
  ].join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": anthropicVersion,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Anthropic request failed: ${resp.status} ${errText}`);
  }

  const message = (await resp.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const responseText =
    message.content?.[0]?.type === "text" ? message.content?.[0]?.text ?? "" : "";

  if (!responseText.trim()) throw new Error("No content returned from Claude");

  const jsonText = extractJsonObject(responseText);
  const parsed = CourseMapSchema.parse(JSON.parse(jsonText));
  return parsed;
}

/**
 * POST /api/courses/generate
 * Creates a course and generates an initial chapter/topic/concept map from syllabusText.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateMockUser();
    const body = await req.json();
    const { title, syllabusText } = GenerateSchema.parse(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const course = await prisma.course.create({
      data: {
        title,
        slug: slugify(title),
        userId: user.id,
      },
    });

    const generated = await callClaudeToGenerateMap({
      apiKey,
      syllabusText,
      courseTitle: course.title,
    });

    for (let i = 0; i < generated.chapters.length; i++) {
      const ch = generated.chapters[i];
      const chapter = await prisma.chapter.create({
        data: {
          courseId: course.id,
          title: ch.title,
          order: i,
        },
      });

      for (let j = 0; j < ch.topics.length; j++) {
        const t = ch.topics[j];
        const topic = await prisma.topic.create({
          data: {
            chapterId: chapter.id,
            title: t.title,
            order: j,
          },
        });

        for (let k = 0; k < t.concepts.length; k++) {
          const c = t.concepts[k];
          await prisma.concept.create({
            data: {
              topicId: topic.id,
              title: c.title,
              order: k,
              summary: null,
              vocabulary: null,
              examples: null,
              tags: null,
              difficulty: null,
            },
          });
        }
      }
    }

    return NextResponse.json({ id: course.id });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Course generation failed" }, { status: 500 });
  }
}

