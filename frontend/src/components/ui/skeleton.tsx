import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * tasteskill: Academic Editorial Skeleton primitive
 * Menggunakan warm parchment ceramic tone (#eae7e7 / #f0eded)
 * yang selaras dengan surface #f7f6f3 dan canvas #fcf9f8 (DESIGN.md),
 * menggantikan cool gray/slate generic default shadcn.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[#eae7e7]/85 transition-colors motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
