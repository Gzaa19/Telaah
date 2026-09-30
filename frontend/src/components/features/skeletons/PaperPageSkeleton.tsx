import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * tasteskill: PaperPageSkeleton
 * Memetakan workspace draf paper: header status penyimpanan,
 * navigator seksi IMRaD di kiri, dan kanvas editor artikel ilmiah di kanan.
 */
export function PaperPageSkeleton() {
  return (
    <main className="flex-1 max-w-7xl mx-auto px-5 md:px-6 py-5 w-full flex flex-col gap-4 bg-[#fcf9f8] text-left animate-in fade-in-50 duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5e7eb]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-56 rounded" />
            <Skeleton className="h-4.5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-72 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7.5 w-24 rounded" />
          <Skeleton className="h-7.5 w-28 rounded bg-[#dce1ff]/80" />
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
        {/* Left: Section Navigator (4 cols) */}
        <Card className="lg:col-span-4 p-3 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0ece7] px-1">
            <Skeleton className="h-3.5 w-28 uppercase rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <div className="space-y-1 pt-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="p-2 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-3.5 h-3.5 rounded-full" />
                  <Skeleton className="h-3.5 w-36 rounded" />
                </div>
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        {/* Right: Academic Manuscript Canvas (8 cols) */}
        <Card className="lg:col-span-8 p-6 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0ece7]">
            <div className="space-y-1">
              <Skeleton className="h-5 w-44 rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
            <Skeleton className="h-7 w-24 rounded" />
          </div>

          {/* Manuscript Content Blocks */}
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-[92%] rounded" />
            <Skeleton className="h-4 w-[96%] rounded" />
            <Skeleton className="h-4 w-[85%] rounded" />
            <div className="pt-2 space-y-3">
              <Skeleton className="h-4 w-[98%] rounded" />
              <Skeleton className="h-4 w-[90%] rounded" />
              <Skeleton className="h-4 w-[70%] rounded" />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
