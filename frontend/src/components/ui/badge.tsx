import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#1d4ed8] text-white shadow-2xs",
        secondary:
          "border-[#e2e8f0] bg-[#f1f5f9] text-[#475569] font-medium",
        destructive:
          "border-[#ffdad6] bg-[#ffdad6]/60 text-[#ba1a1a]",
        outline:
          "text-[#434655] border-[#e5e7eb] bg-white",
        success:
          "border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46] font-medium",
        warning:
          "border-[#fed7aa] bg-[#fffbeb] text-[#b45309] font-medium",
        info:
          "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8] font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
