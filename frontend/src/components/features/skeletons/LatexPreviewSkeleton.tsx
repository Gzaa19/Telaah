import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * tasteskill: LatexPreviewSkeleton
 * Memetakan halaman pratinjau kode sumber LaTeX & BibTeX:
 * header kompilasi dan split screen editor kode / pratinjau.
 */
export function LatexPreviewSkeleton() {
  return (
    <main className="flex-1 max-w-7xl mx-auto px-5 md:px-6 py-5 w-full flex flex-col gap-4 bg-[#fcf9f8] text-left animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5e7eb]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-52 rounded" />
            <Skeleton className="h-4.5 w-20 rounded" />
          </div>
          <Skeleton className="h-3 w-80 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md bg-[#dce1ff]/80" />
        </div>
      </div>

      {/* Split Screen: Left Code, Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch">
        <Card className="lg:col-span-6 p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3 min-h-[420px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0ece7]">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((line) => (
              <div key={line} className="flex gap-3">
                <Skeleton className="h-3 w-6 rounded shrink-0" />
                <Skeleton
                  className="h-3 rounded"
                  style={{ width: `${30 + ((line * 17) % 60)}%` }}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-6 p-6 border-[#e5e7eb] bg-[#f7f6f3] rounded-lg shadow-2xs flex flex-col items-center justify-center min-h-[420px] space-y-3">
          <Skeleton className="w-16 h-20 rounded-md" />
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-3 w-64 rounded" />
        </Card>
      </div>
    </main>
  );
}
