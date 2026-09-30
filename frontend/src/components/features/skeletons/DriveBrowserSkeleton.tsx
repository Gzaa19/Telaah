import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * tasteskill: DriveBrowserSkeleton
 * Memetakan Google Drive browser: back button, breadcrumb folder hierarchy,
 * search input, dan daftar file Drive dengan icon dan tombol Pilih.
 */
export function DriveBrowserSkeleton() {
  return (
    <div className="flex-1 w-full px-5 md:px-6 py-5 md:py-6 flex flex-col gap-6 bg-[#fcf9f8] animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8.5 w-8.5 rounded-md" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-64 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
            </div>
            <Skeleton className="h-3.5 w-96 rounded" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>

      {/* Main Drive Box */}
      <Card className="flex-1 flex flex-col border-[#e5e7eb] bg-white rounded-lg shadow-2xs overflow-hidden">
        {/* Navigation Breadcrumb Bar */}
        <div className="p-3 border-b border-[#e5e7eb] bg-[#f7f6f3] flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="h-7 w-56 rounded" />
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2 border-b border-[#e5e7eb] bg-[#f7f6f3] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-6 w-36 rounded" />
          </div>
          <Skeleton className="h-4 w-28 rounded" />
        </div>

        {/* File Rows Skeleton (6 rows) */}
        <div className="divide-y divide-[#e5e7eb] min-h-[350px]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-60 rounded" />
                  <Skeleton className="h-2.5 w-32 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Skeleton className="h-3.5 w-16 rounded hidden sm:block" />
                <Skeleton className="h-3.5 w-24 rounded hidden md:block" />
                <Skeleton className="h-7 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
