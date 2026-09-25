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

/**
 * ponytail: Academic Editorial Canvas IndexingStatusBadge
 * Follows 4px rounded radius, Archival Emerald for indexed, Royal Blue for processing,
 * and high-contrast WCAG-compliant tags.
 */
export function IndexingStatusBadge({
  status,
  stage,
  totalChunks,
  onRetry,
  onClick,
  compact = false,
}: IndexingStatusBadgeProps) {
  switch (status) {
    case "indexed":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] hover:bg-[#d1fae5] transition-colors cursor-pointer"
          title="Dokumen telah diindeks ke pgvector. Klik untuk melihat detail."
        >
          <CheckCircle weight="fill" className="w-3.5 h-3.5 text-[#006c4a]" />
          <span>Terindeks</span>
          {typeof totalChunks === "number" && !compact && (
            <span className="text-[10px] bg-[#a7f3d0]/60 text-[#065f46] px-1.5 py-0 rounded font-mono">
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
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#ffdad6]/60 text-[#ba1a1a] border border-[#ffdad6] hover:bg-[#ffdad6] transition-colors cursor-pointer"
            title="Proses indexing gagal. Klik untuk melihat alasan kegagalan."
          >
            <WarningCircle weight="fill" className="w-3.5 h-3.5 text-[#ba1a1a]" />
            <span>Gagal</span>
          </button>
          {onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-white text-[#1c1b1b] border border-[#e5e7eb] hover:bg-[#f7f6f3] transition-colors cursor-pointer"
              title="Coba ulang proses indexing"
            >
              <ArrowsClockwise weight="bold" className="w-3 h-3 text-[#1d4ed8]" />
              <span>Coba Lagi</span>
            </button>
          )}
        </div>
      );

    case "cleaning":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe] transition-colors cursor-pointer"
        >
          <Sparkle weight="bold" className="w-3 h-3 text-[#1d4ed8] animate-pulse" />
          <span>Pembersihan Teks</span>
        </button>
      );

    case "chunking":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe] transition-colors cursor-pointer"
        >
          <Scissors weight="bold" className="w-3 h-3 text-[#1d4ed8] animate-pulse" />
          <span>Memotong Chunk</span>
        </button>
      );

    case "embedding":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe] transition-colors cursor-pointer"
        >
          <Cpu weight="bold" className="w-3 h-3 text-[#1d4ed8] animate-pulse" />
          <span>Embedding Lokal (E5)</span>
        </button>
      );

    case "storing":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe] transition-colors cursor-pointer"
        >
          <Database weight="bold" className="w-3 h-3 text-[#1d4ed8] animate-pulse" />
          <span>Menyimpan pgvector</span>
        </button>
      );

    case "queued":
      return (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0] hover:bg-[#e2e8f0] transition-colors cursor-pointer"
        >
          <Clock weight="regular" className="w-3 h-3 text-[#475569]" />
          <span>Dalam Antrean</span>
        </button>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#f7f6f3] text-[#747686] border border-[#e5e7eb]">
          <Clock weight="regular" className="w-3 h-3" />
          <span>Belum Diindeks</span>
        </span>
      );
  }
}
