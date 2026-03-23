import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-notion font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-notion-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-notion-accent text-white hover:bg-notion-accent-hover active:scale-[0.98]",
        secondary:
          "bg-notion-bg-secondary text-notion-text border border-notion-border hover:bg-notion-hover hover:border-notion-border-hover active:scale-[0.98]",
        ghost: "hover:bg-notion-hover text-notion-text active:scale-[0.98]",
        destructive: "bg-red-500/20 text-red-400 hover:bg-red-500/30 active:scale-[0.98]",
        link: "text-notion-accent underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        default: "h-8 px-3 text-sm",
        lg: "h-9 px-4 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
