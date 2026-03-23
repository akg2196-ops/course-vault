import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const ClaudeChaptersSchema = z.object({
  chapters: z.array(
    z.object({
      title: z.string(),
      order: z.number(),
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
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course || !course.syllabusText) {
      return NextResponse.json(
        { error: "Course or syllabus not found" },
        { status: 404 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

    const prompt = `You are parsing a course syllabus to extract its chapter structure. Return ONLY valid JSON, no code fences, no other text.
Return this exact schema:
{ "chapters": [ { "title": string, "order": number } ] }
Rules:

Extract chapters only — do NOT generate topics or concepts yet
Use week numbers, units, modules, or major sections as chapters
Do not invent content — only extract what is explicitly in the syllabus
Keep titles concise and clean
order starts at 0

Syllabus: ${course.syllabusText}`;

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    if (!responseText.trim()) throw new Error("No content returned from Claude");

    const jsonText = extractJsonObject(responseText);
    const parsed = ClaudeChaptersSchema.parse(JSON.parse(jsonText));
    const { chapters } = parsed;

    return NextResponse.json({ ok: true, chapters });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate chapters" },
      { status: 500 }
    );
  }
}

