"use client";

import React, { useState } from "react";
import { useDocumentStatus } from "@/hooks/useDocumentStatus";
import { retryImportDocument, DocumentApiError } from "@/lib/api/documents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  CircleNotch,
  WarningOctagon,
  ArrowClockwise,
  FileText,
  Clock,
} from "@phosphor-icons/react";

interface ImportProgressProps {
  documentId: string;
  onCompleted?: () => void;
  onRetrySuccess?: () => void;
}

export function ImportProgress({
  documentId,
  onCompleted,
  onRetrySuccess,
}: ImportProgressProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const { statusData, isLoading, error, isCompleted, isFailed, refetch } =
    useDocumentStatus({
      documentId,
      onCompleted,
    });

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);
    try {
      await retryImportDocument(documentId);
      refetch();
      onRetrySuccess?.();
    } catch (err: any) {
      if (err instanceof DocumentApiError) {
        setRetryError(err.message);
      } else {
        setRetryError(err.message || "Gagal mengulang proses impor.");
      }
    } finally {
      setIsRetrying(false);
    }
  };

  if (!statusData && isLoading) {
    return (
      <div className="p-5 bg-white border border-[#e5e7eb] rounded flex items-center justify-center text-[#747686] gap-2 shadow-2xs">
        <CircleNotch size={18} className="animate-spin text-[#1d4ed8]" />
        <span className="text-xs">Memuat status impor dokumen...</span>
      </div>
    );
  }

  if (!statusData) {
    return null;
  }

  const { file_name, import_status, failure_reason } = statusData;

  const steps = [
    {
      id: "importing",
      label: "1. Unduh Berkas",
      description: "Mengambil data biner dari Google Drive",
    },
    {
      id: "extracting",
      label: "2. Ekstraksi Teks",
      description: "Mengekstrak teks halaman & metadata",
    },
    {
      id: "extracted",
      label: "3. Siap Dipakai",
      description: "Teks tersedia untuk sitasi & penulisan",
    },
  ];

  const getStepState = (stepId: string) => {
    if (isFailed) {
      if (import_status === stepId) return "failed";
    }
    if (import_status === "extracted") return "completed";
    if (import_status === "extracting") {
      if (stepId === "importing") return "completed";
      if (stepId === "extracting") return "active";
      return "pending";
    }
    if (import_status === "importing") {
      if (stepId === "importing") return "active";
      return "pending";
    }
    return "pending";
  };

  return (
    <div className="p-4 bg-white border border-[#e5e7eb] rounded shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_-1px_rgba(15,23,42,0.02)] space-y-3 text-left">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} weight="regular" className="text-[#1d4ed8]" />
          <span className="text-xs font-semibold text-[#1c1b1b] truncate max-w-sm">
            {file_name}
          </span>
        </div>
        <div>
          {isCompleted && (
            <Badge variant="success" className="gap-1 bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]">
              <CheckCircle size={12} weight="fill" />
              <span>Selesai Diekstrak</span>
            </Badge>
          )}
          {isFailed && (
            <Badge variant="destructive" className="gap-1 bg-[#ffdad6]/60 text-[#ba1a1a] border-[#ffdad6]">
              <WarningOctagon size={12} weight="fill" />
              <span>Gagal</span>
            </Badge>
          )}
          {!isCompleted && !isFailed && (
            <Badge variant="info" className="gap-1 bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]">
              <CircleNotch size={12} className="animate-spin" />
              <span>Memproses...</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {steps.map((step, idx) => {
          const state = getStepState(step.id);
          return (
            <div
              key={step.id}
              className={`p-3 rounded border flex flex-col gap-1 transition-all ${
                state === "completed"
                  ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                  : state === "active"
                  ? "bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8] shadow-2xs"
                  : state === "failed"
                  ? "bg-[#ffdad6]/40 border-[#ffdad6] text-[#ba1a1a]"
                  : "bg-[#f7f6f3] border-[#e5e7eb] text-[#747686]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider">
                  Langkah {idx + 1}
                </span>
                {state === "completed" && (
                  <CheckCircle size={14} weight="fill" className="text-[#006c4a]" />
                )}
                {state === "active" && (
                  <CircleNotch size={14} className="animate-spin text-[#1d4ed8]" />
                )}
                {state === "failed" && (
                  <WarningOctagon size={14} weight="fill" className="text-[#ba1a1a]" />
                )}
                {state === "pending" && <Clock size={14} className="text-[#747686]" />}
              </div>
              <p className="text-xs font-semibold leading-snug">
                {step.label}
              </p>
              <p className="text-[10.5px] opacity-80 leading-tight">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Failure reason and Retry button */}
      {isFailed && (
        <div className="p-3 bg-[#ffdad6]/40 border border-[#ffdad6] rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <WarningOctagon size={18} weight="fill" className="text-[#ba1a1a] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#ba1a1a]">
                Gagal Mengimpor Dokumen
              </p>
              <p className="text-xs text-[#ba1a1a]/90 mt-0.5">
                {failure_reason || "Terjadi kesalahan saat memproses berkas."}
              </p>
              {retryError && (
                <p className="text-[11px] text-[#ba1a1a] mt-1">{retryError}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-xs shrink-0 gap-1.5 h-7.5 rounded"
          >
            {isRetrying ? (
              <CircleNotch size={13} className="animate-spin" />
            ) : (
              <ArrowClockwise size={13} weight="bold" />
            )}
            <span>{isRetrying ? "Mengulang..." : "Coba Lagi"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
