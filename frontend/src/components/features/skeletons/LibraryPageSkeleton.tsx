import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * tasteskill: LibraryPageSkeleton
 * Memetakan halaman Pustaka Literatur: header aksi, filter bar,
 * dan baris-baris tabel dokumen dengan metadata keterlacakan.
 */
export function LibraryPageSkeleton() {
  return (
    <div className="flex-1 max-w-6xl mx-auto px-5 md:px-6 py-5 md:py-6 w-full space-y-4.5 bg-[#fcf9f8] text-left animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-80 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md bg-[#dce1ff]/80" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <Skeleton className="h-8 w-full sm:w-80 rounded-md border border-[#e5e7eb]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-[#e5e7eb] rounded-lg overflow-hidden shadow-2xs">
        {/* Table Header */}
        <div className="p-3.5 border-b border-[#e5e7eb] bg-[#f7f6f3] flex items-center justify-between">
          <Skeleton className="h-3.5 w-40 uppercase rounded" />
          <Skeleton className="h-4 w-28 rounded-full" />
        </div>

        {/* Table Columns Head */}
        <div className="border-b border-[#e5e7eb] bg-[#fcfbf9] px-4 py-2.5 grid grid-cols-12 gap-3 text-[10.5px]">
          <Skeleton className="col-span-1 h-3 w-4 rounded" />
          <Skeleton className="col-span-4 h-3 w-28 rounded" />
          <Skeleton className="col-span-2 h-3 w-16 rounded" />
          <Skeleton className="col-span-2 h-3 w-20 rounded" />
          <Skeleton className="col-span-3 h-3 w-24 rounded" />
        </div>

        {/* Table Rows Skeleton (5 rows) */}
        <div className="divide-y divide-[#e5e7eb]">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="px-4 py-3.5 grid grid-cols-12 gap-3 items-center">
              <Skeleton className="col-span-1 w-6 h-6 rounded" />
              <div className="col-span-4 space-y-1">
                <Skeleton className="h-3.5 w-52 rounded" />
                <Skeleton className="h-2.5 w-24 rounded" />
              </div>
              <Skeleton className="col-span-2 h-5 w-16 rounded" />
              <Skeleton className="col-span-2 h-5 w-24 rounded-full" />
              <div className="col-span-3 flex justify-end gap-2">
                <Skeleton className="h-7 w-20 rounded" />
                <Skeleton className="h-7 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
