import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * tasteskill: DashboardPageSkeleton
 * Mencerminkan layout H1 selamat datang, bento metric cards, step workflow,
 * dan daftar aktivitas terkini dengan proporsi yang persis sama.
 */
export function DashboardPageSkeleton() {
  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-4.5 w-full space-y-4 bg-[#fcf9f8] text-left animate-in fade-in-50 duration-200">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-1">
        <div className="space-y-2">
          {/* Pill Badge */}
          <Skeleton className="h-5 w-44 rounded-full bg-[#dce1ff]/70" />
          {/* Title Newsreader font */}
          <Skeleton className="h-8 w-80 rounded" />
          {/* Subtitle */}
          <Skeleton className="h-3.5 w-96 max-w-xl rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md bg-[#dce1ff]/80" />
        </div>
      </div>

      {/* 4 Bento Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-3.5 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="w-6 h-6 rounded bg-[#f0eded]" />
            </div>
            <Skeleton className="h-7 w-14 rounded" />
            <Skeleton className="h-2.5 w-24 rounded" />
          </Card>
        ))}
      </div>

      {/* Main Feature Cards Grid: 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Workflow Steps Card (2 cols) */}
        <Card className="md:col-span-2 p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0ece7]">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-36 uppercase rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          <div className="space-y-2.5 pt-1">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="p-3 rounded-lg border border-[#e5e7eb] bg-[#fcfbf9] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-48 rounded" />
                    <Skeleton className="h-2.5 w-64 rounded" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded" />
              </div>
            ))}
          </div>
        </Card>

        {/* Right: Info & Status Card */}
        <Card className="p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3">
          <div className="space-y-1 pb-2 border-b border-[#f0ece7]">
            <Skeleton className="h-3.5 w-28 uppercase rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>

          <div className="space-y-2.5 pt-1">
            <Skeleton className="h-16 w-full rounded-lg bg-[#f0eded]/70" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-md bg-[#dce1ff]/70" />
          </div>
        </Card>
      </div>
    </main>
  );
}
