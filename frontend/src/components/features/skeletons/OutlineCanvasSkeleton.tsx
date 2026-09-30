import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * tasteskill: OutlineCanvasSkeleton
 * Memetakan editor kerangka outline ilmiah: header versi/persetujuan,
 * tree navigation seksi IEEE di kiri, dan field editor form di kanan.
 */
export function OutlineCanvasSkeleton() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-44px)] overflow-hidden bg-[#fcf9f8] text-left animate-in fade-in-50 duration-200">
      {/* Top Header Action Bar */}
      <div className="h-14 border-b border-[#e5e7eb] bg-white px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-44 rounded" />
              <Skeleton className="h-4.5 w-16 rounded-full" />
              <Skeleton className="h-4.5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md bg-[#82f5c1]/60" />
        </div>
      </div>

      {/* Main Dual Pane Studio Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section Tree Nav (320px) */}
        <div className="w-72 lg:w-80 border-r border-[#e5e7eb] bg-[#f7f6f3] flex flex-col shrink-0 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
            <Skeleton className="h-3.5 w-28 uppercase rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <div className="space-y-2 pt-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3 bg-white border border-[#e5e7eb] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3.5 w-10 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Section Field Editor Canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Section Banner */}
          <Card className="p-5 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-52 rounded" />
              <Skeleton className="h-7 w-28 rounded" />
            </div>
            <Skeleton className="h-3.5 w-80 rounded" />
          </Card>

          {/* Field Cards (2 cards) */}
          {[1, 2].map((f) => (
            <Card key={f} className="p-5 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-24 w-full rounded-md bg-[#f7f6f3]" />
              <div className="flex items-center justify-between pt-2 border-t border-[#f0ece7]">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-7 w-20 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
