import { notFound } from "next/navigation";
import { getOrCreateMockUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseTreeCanvas } from "@/components/CourseTreeCanvas";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params;
  const user = await getOrCreateMockUser();

  const course = await prisma.course.findFirst({
    where: { id: courseId, userId: user.id },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          topics: {
            orderBy: { order: "asc" },
            include: {
              concepts: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex w-full shrink-0 items-center border-b border-gray-100 px-8 py-4">
        <div className="flex-1 text-left text-sm font-medium text-gray-400">{course.title}</div>
        <h1 className="text-xl font-bold text-gray-900">Course Map</h1>
        <div className="flex-1" />
      </div>
      <CourseTreeCanvas course={course} />
    </div>
  );
}
