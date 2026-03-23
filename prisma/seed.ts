import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "dev@coursevault.local";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hash = await bcrypt.hash("dev123", 10);
    user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name: "Dev User",
      },
    });
  }

  const existing = await prisma.course.findFirst({
    where: { userId: user.id, title: "Introduction to Psychology" },
  });
  if (existing) {
    console.log("Example course already exists. Skipping seed.");
    return;
  }

  const course = await prisma.course.create({
    data: {
      title: "Introduction to Psychology",
      slug: "intro-psychology",
      userId: user.id,
    },
  });

  const ch1 = await prisma.chapter.create({
    data: { courseId: course.id, title: "History and Methods", order: 0 },
  });
  const top1 = await prisma.topic.create({
    data: { chapterId: ch1.id, title: "Origins of Psychology", order: 0 },
  });
  await prisma.concept.create({
    data: {
      topicId: top1.id,
      title: "Structuralism vs Functionalism",
      order: 0,
      summary:
        "Structuralism focused on breaking down mental processes into basic components, while functionalism emphasized the adaptive purpose of behavior and consciousness.",
      vocabulary: JSON.stringify([
        { term: "Structuralism", definition: "Early school focused on structure of mind via introspection." },
        { term: "Functionalism", definition: "School focused on how mental processes help adaptation." },
      ]),
      examples: "Wundt's lab (structuralism); James's stream of consciousness (functionalism).",
      tags: JSON.stringify(["history", "schools"]),
      difficulty: "medium",
    },
  });
  await prisma.concept.create({
    data: {
      topicId: top1.id,
      title: "Scientific Method in Psychology",
      order: 1,
      summary: "Psychologists use systematic observation, experimentation, and replication.",
      tags: JSON.stringify(["methods"]),
      difficulty: "easy",
    },
  });

  const ch2 = await prisma.chapter.create({
    data: { courseId: course.id, title: "Memory", order: 0 },
  });
  const top2 = await prisma.topic.create({
    data: { chapterId: ch2.id, title: "Stages of Memory", order: 0 },
  });
  await prisma.concept.create({
    data: {
      topicId: top2.id,
      title: "Sensory, Short-term, Long-term",
      order: 0,
      summary: "Information flows from sensory memory through short-term (working) to long-term storage.",
      vocabulary: JSON.stringify([
        { term: "Working memory", definition: "Active maintenance and manipulation of limited information." },
      ]),
      tags: JSON.stringify(["memory", "cognition"]),
      difficulty: "medium",
    },
  });

  console.log("Seeded example course:", course.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
