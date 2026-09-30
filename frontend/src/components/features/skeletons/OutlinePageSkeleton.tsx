import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * tasteskill: OutlinePageSkeleton
 * Memetakan halaman Outline Generator: header icon, dokumen rujukan card,
 * template selection bento card dengan preview spek, dan tombol generate.
 */
export function OutlinePageSkeleton() {
  return (
    <main className="flex-1 max-w-4xl mx-auto px-5 md:px-6 py-5 w-full space-y-4 bg-[#fcf9f8] text-left animate-in fade-in-50 duration-200">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-md bg-[#eff6ff] border border-[#bfdbfe]" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-3.5 w-80 rounded" />
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* 2. Card Dokumen Rujukan */}
        <Card className="p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-28 uppercase rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-9 w-full rounded border border-[#e5e7eb]" />
        </Card>

        {/* 3. Card Format Template */}
        <Card className="p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-32 uppercase rounded" />
              <Skeleton className="h-3 w-72 rounded" />
            </div>
          </div>

          {/* Template Selection Bento Card Skeleton */}
          <div className="p-5 rounded-2xl border border-[#d1c7bd] bg-[#fcfbf9] space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>
              <Skeleton className="w-5 h-5 rounded-full" />
            </div>

            {/* Template Specs Explainer */}
            <Skeleton className="h-14 w-full rounded-xl bg-[#f0eded]/70" />

            {/* Tags & Action Button Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#f0ece7]">
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
                <Skeleton className="h-5 w-24 rounded" />
              </div>
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        </Card>

        {/* 4. Card Opsi Bahasa & Submit */}
        <Card className="p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3">
          <div className="space-y-1">
            <Skeleton className="h-3 w-24 uppercase rounded" />
            <Skeleton className="h-3 w-60 rounded" />
          </div>
          <Skeleton className="h-9 w-full rounded" />
        </Card>

        {/* 5. Primary CTA Button Skeleton */}
        <Skeleton className="h-10 w-full rounded-lg bg-[#dce1ff]/70" />
      </div>
    </main>
  );
}
