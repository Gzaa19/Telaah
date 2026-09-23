"use client";

import React from "react";
import {
  CheckCircle,
  WarningCircle,
  Clock,
  Sparkle,
  Scissors,
  Cpu,
  Database,
  ArrowsClockwise,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { IndexingStatus } from "@/types/indexing";

interface IndexingStatusBadgeProps {
  status: IndexingStatus | string;
  stage?: string | null;
  totalChunks?: number | null;
  onRetry?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

export function IndexingStatusBadge({
  status,
  stage,
  totalChunks,
  onRetry,
  onClick,
  compact = false,
}: IndexingStatusBadgeProps) {
  // Normalize display configuration
  switch (status) {
    case "indexed":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition-colors cursor-pointer"
          title="Dokumen telah diindeks ke pgvector. Klik untuk melihat detail."
        >
          <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-600" />
          <span>Terindeks</span>
          {typeof totalChunks === "number" && !compact && (
            <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.2 rounded-full font-mono">
              {totalChunks} chunk
            </span>
          )}
        </button>
      );

    case "failed":
      return (
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 transition-colors cursor-pointer"
            title="Indexing gagal. Klik untuk rincian."
          >
            <WarningCircle weight="fill" className="w-3.5 h-3.5 text-rose-600" />
            <span>Gagal</span>
          </button>
          {onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 transition-colors cursor-pointer border border-rose-300"
              title="Coba lagi proses indexing"
            >
              <ArrowClockwise weight="bold" className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      );

    case "cleaning":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/80 animate-pulse cursor-pointer"
        >
          <Sparkle weight="bold" className="w-3.5 h-3.5 text-sky-600 animate-spin" />
          <span>Membersihkan teks...</span>
        </button>
      );

    case "chunking":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 animate-pulse cursor-pointer"
        >
          <Scissors weight="bold" className="w-3.5 h-3.5 text-amber-600" />
          <span>Memotong chunk...</span>
        </button>
      );

    case "embedding":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80 animate-pulse cursor-pointer"
        >
          <Cpu weight="bold" className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
          <span>Embedding lokal (E5)...</span>
        </button>
      );

    case "storing":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200/80 animate-pulse cursor-pointer"
        >
          <Database weight="bold" className="w-3.5 h-3.5 text-teal-600" />
          <span>Menyimpan pgvector...</span>
        </button>
      );

    case "queued":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80 cursor-pointer"
        >
          <Clock weight="bold" className="w-3.5 h-3.5 text-slate-500 animate-spin" />
          <span>Antrean</span>
        </button>
      );

    case "archived":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-50 text-stone-600 border border-stone-200">
          <Clock weight="regular" className="w-3.5 h-3.5 text-stone-400" />
          <span>Diarsipkan</span>
        </span>
      );

    case "not_indexed":
    default:
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <Sparkle weight="regular" className="w-3.5 h-3.5 text-zinc-400" />
          <span>Belum Diindeks</span>
        </button>
      );
  }
}
