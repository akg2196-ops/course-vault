import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Course Builder",
};

export default function CourseMapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
