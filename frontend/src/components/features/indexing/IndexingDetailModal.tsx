"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  FileText,
  Cpu,
  Scissors,
  Database,
  Clock,
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  Hash,
} from "@phosphor-icons/react";
import { DocumentIndexSummaryResponse } from "@/types/indexing";
import { fetchDocumentIndexSummary, triggerIndexing } from "@/lib/api/indexing";
import { ReindexConfirmModal } from "./ReindexConfirmModal";
import { useReindex } from "@/hooks/useReindex";

interface IndexingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  fileName?: string;
  onReindexTriggered?: () => void;
}

export function IndexingDetailModal({
  isOpen,
  onClose,
  documentId,
  fileName,
  onReindexTriggered,
}: IndexingDetailModalProps) {
  const [summary, setSummary] = useState<DocumentIndexSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showReindexConfirm, setShowReindexConfirm] = useState<boolean>(false);

  const { reindex, isLoading: isReindexLoading } = useReindex({
    onSuccess: () => {
      setActionSuccess("Re-indexing berhasil dimulai.");
      setShowReindexConfirm(false);
      onReindexTriggered?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    },
    onError: (err) => {
      setError(err.message || "Gagal memicu proses re-indexing.");
      setShowReindexConfirm(false);
    },
  });

  useEffect(() => {
    if (!isOpen || !documentId) {
      setSummary(null);
      setError(null);
      setActionSuccess(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchDocumentIndexSummary(documentId)
      .then((data) => {
        if (isMounted) setSummary(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Gagal memuat rincian ringkasan index.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const handleRetry = async () => {
    if (!documentId) return;
    setIsActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      await triggerIndexing(documentId);
      setActionSuccess("Proses indexing ulang dimulai.");
      onReindexTriggered?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Gagal mengulang indexing.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Cpu weight="duotone" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Rincian Indexing & Embedding
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">
                {fileName || summary?.file_name || "Detail Dokumen"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <ArrowClockwise className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs">Memuat metadata vektor...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2.5">
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Informasi Index Tidak Ditemukan</p>
                <p className="mt-0.5 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {summary && !isLoading && (
            <>
              {/* Status Header Block */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Status Index:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      summary.status === "indexed"
                        ? "bg-emerald-100 text-emerald-800"
                        : summary.status === "failed"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {summary.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock weight="regular" className="w-3.5 h-3.5" />
                  <span>
                    {summary.completed_at
                      ? new Date(summary.completed_at).toLocaleString("id-ID")
                      : "Sedang diproses"}
                  </span>
                </div>
              </div>

              {/* Grid Specifications */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Model Embedding</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-xs truncate" title={summary.model_name}>
                    {summary.model_name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Versi: {summary.model_version}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                    <Database className="w-3.5 h-3.5 text-teal-500" />
                    <span>Dimensi Vektor</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {summary.embedding_dimension} Dimensi
                  </p>
                  <p className="text-[10px] text-teal-600 mt-0.5">HNSW pgvector Cosine</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                    <Scissors className="w-3.5 h-3.5 text-amber-500" />
                    <span>Total Chunk</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {summary.total_chunks ?? 0} Potongan
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Ukuran: {summary.chunk_size} char (overlap: {summary.chunk_overlap})
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Checksum SHA-256</span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-700 truncate" title={summary.source_checksum}>
                    {summary.source_checksum}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Integritas terverifikasi</p>
                </div>
              </div>

              {/* Version ID */}
              <div className="p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 text-xs flex items-center justify-between">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Index Version ID:
                </span>
                <span className="font-mono text-[11px] text-slate-600">
                  {summary.index_version_id}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {summary?.status === "failed" && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <ArrowClockwise weight="bold" className={`w-3.5 h-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
                <span>Coba Lagi</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowReindexConfirm(true)}
              disabled={isActionLoading || isReindexLoading || isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <ArrowClockwise weight="bold" className={`w-3.5 h-3.5 ${isReindexLoading ? "animate-spin" : ""}`} />
              <span>Re-index Dokumen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ReindexConfirmModal
        isOpen={showReindexConfirm}
        onClose={() => setShowReindexConfirm(false)}
        onConfirm={() => {
          if (documentId) {
            reindex(documentId);
          }
        }}
        fileName={fileName || summary?.file_name}
        isLoading={isReindexLoading}
      />
    </div>
  );
}
