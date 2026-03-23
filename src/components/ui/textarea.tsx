import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-notion border border-notion-border bg-notion-bg-secondary px-2.5 py-2 text-sm text-notion-text placeholder:text-notion-text-tertiary",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-notion-accent focus-visible:border-notion-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
