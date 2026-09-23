"use client";

import React from "react";
import { Sparkle, ArrowClockwise } from "@phosphor-icons/react";
import { useIndexingStatus } from "@/hooks/useIndexingStatus";
import { IndexingStatusBadge } from "./IndexingStatusBadge";

interface DocumentIndexingCellProps {
  documentId: string;
  importStatus: string;
  onOpenDetail: (docId: string) => void;
}

export function DocumentIndexingCell({
  documentId,
  importStatus,
  onOpenDetail,
}: DocumentIndexingCellProps) {
  const {
    status,
    stage,
    totalChunks,
    isLoading,
    isTriggering,
    startIndexing,
  } = useIndexingStatus({
    documentId: importStatus === "extracted" ? documentId : null,
  });

  if (importStatus !== "extracted") {
    return <span className="text-slate-500 text-xs italic">Menunggu ekstraksi</span>;
  }

  if (isLoading && !status) {
    return (
      <span className="text-slate-400 text-xs flex items-center gap-1">
        <ArrowClockwise className="w-3 h-3 animate-spin text-indigo-400" />
        <span>Memeriksa...</span>
      </span>
    );
  }

  if (status === "not_indexed") {
    return (
      <button
        type="button"
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await startIndexing();
          } catch {
            // Error handled in hook
          }
        }}
        disabled={isTriggering}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors cursor-pointer disabled:opacity-50"
        title="Klik untuk memproses chunking dan embedding lokal (pgvector)"
      >
        <Sparkle weight="bold" className={`w-3 h-3 text-indigo-400 ${isTriggering ? "animate-spin" : ""}`} />
        <span>{isTriggering ? "Memulai..." : "Index Dokumen"}</span>
      </button>
    );
  }

  return (
    <IndexingStatusBadge
      status={status}
      stage={stage}
      totalChunks={totalChunks}
      onClick={() => onOpenDetail(documentId)}
      onRetry={() => startIndexing()}
    />
  );
}
