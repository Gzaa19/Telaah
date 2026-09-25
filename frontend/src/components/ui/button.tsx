import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * ponytail: Academic Editorial Canvas button primitive with disciplined 4px radius and high-contrast WCAG colors
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#1d4ed8] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#1d4ed8] text-white shadow-xs hover:bg-[#1e40af] active:translate-y-[1px]",
        destructive:
          "bg-[#ba1a1a] text-white shadow-xs hover:bg-[#93000a] active:translate-y-[1px]",
        outline:
          "border border-[#e5e7eb] bg-white text-[#1c1b1b] shadow-2xs hover:bg-[#f7f6f3] hover:text-[#0f172a] hover:border-[#c4c5d7]",
        secondary:
          "bg-[#f0eded] text-[#1c1b1b] shadow-2xs hover:bg-[#eae7e7] border border-[#e5e2e1]",
        ghost:
          "text-[#434655] hover:bg-[#f7f6f3] hover:text-[#1c1b1b]",
        link: "text-[#1d4ed8] underline-offset-4 hover:underline",
        google:
          "bg-white text-[#1c1b1b] shadow-xs hover:bg-[#f7f6f3] border border-[#e5e7eb] font-semibold",
      },
      size: {
        default: "h-8 px-3.5 py-1.5 text-xs rounded",
        sm: "h-7 rounded px-2.5 text-[11px]",
        lg: "h-10 rounded px-5 text-sm",
        icon: "h-8 w-8 rounded",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
