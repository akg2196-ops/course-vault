import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
export const maxDuration = 60;

const RequestBodySchema = z.object({
  feedback: z.string().optional(),
});

const ClaudeTopicsSchema = z.object({
  chapters: z.array(
    z.object({
      chapterId: z.string(),
      topics: z.array(
        z.object({
          title: z.string(),
          order: z.number(),
        })
      ),
    })
  ),
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    let feedback: string | undefined;
    const rawBody = await req.text();
    if (rawBody.trim().length > 0) {
      const parsedBody = RequestBodySchema.parse(JSON.parse(rawBody));
      feedback = parsedBody.feedback;
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          select: { id: true, title: true },
        },
      },
    });

    if (!course || course.chapters.length === 0) {
      return NextResponse.json(
        { error: "Course or chapters not found" },
        { status: 404 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

    const chapterLines = course.chapters
      .map((chapter) => `chapterId: ${chapter.id}, title: ${chapter.title}`)
      .join("\n");

    const feedbackLine = feedback
      ? `\nThe user has provided this feedback: ${feedback}\n`
      : "\n";

    const prompt = `You are generating topics for a course that has already had its chapters approved. Return ONLY valid JSON, no code fences, no other text.
Return this exact schema:
{ "chapters": [ { "chapterId": string, "topics": [ { "title": string, "order": number } ] } ] }
Rules:

Generate 2-5 topics per chapter based on the chapter title
Stay true to each chapter title — do not invent unrelated content
order starts at 0 within each chapter
chapterId must exactly match the chapter ids provided below
Keep topic titles concise and specific${feedbackLine}
Chapters:
${chapterLines}`;

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!responseText.trim()) throw new Error("No content returned from Claude");

    const jsonText = extractJsonObject(responseText);
    const parsed = ClaudeTopicsSchema.parse(JSON.parse(jsonText));

    return NextResponse.json({ ok: true, chapters: parsed.chapters });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate topics" },
      { status: 500 }
    );
  }
}
