import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const RequestBodySchema = z.object({
  feedback: z.string().optional(),
});

const ClaudeConceptsSchema = z.object({
  topics: z.array(
    z.object({
      topicId: z.string(),
      concepts: z.array(
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
          include: {
            topics: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    const allTopics = course?.chapters?.flatMap((ch) =>
      ch.topics.map((t) => ({ ...t, chapterTitle: ch.title }))
    ) ?? [];

    if (!course || course.chapters.length === 0 || allTopics.length === 0) {
      return NextResponse.json(
        { error: "Course, chapters, or topics not found" },
        { status: 404 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

    const topicLines = allTopics
      .map(
        (t) =>
          `topicId: ${t.id}, title: ${t.title}, chapter: ${t.chapterTitle}`
      )
      .join("\n");

    const feedbackLine = feedback
      ? `\nThe user provided this feedback: ${feedback}\n`
      : "";

    const prompt = `You are generating concepts for a course that has had its chapters and topics approved. Return ONLY valid JSON, no code fences, no other text.
Return this exact schema:
{ "topics": [ { "topicId": string, "concepts": [ { "title": string, "order": number } ] } ] }
Rules:

Generate 2-3 concepts per topic
If the syllabus content suggests specific concepts, use those — otherwise infer from the topic title
order starts at 0 within each topic
topicId must exactly match the topic ids provided
Keep concept titles concise and specific — these are the smallest unit of knowledge in the course
Be concise with concept titles — keep each title under 8 words.${feedbackLine}

Topics:
${topicLines}`;

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
    let parsed: z.infer<typeof ClaudeConceptsSchema>;
    try {
      parsed = ClaudeConceptsSchema.parse(JSON.parse(jsonText));
    } catch (e) {
      console.error("Failed to parse Claude response:", jsonText);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, topics: parsed.topics });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate concepts" },
      { status: 500 }
    );
  }
}
