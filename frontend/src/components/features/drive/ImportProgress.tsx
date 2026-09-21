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
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 gap-2">
        <CircleNotch size={20} className="animate-spin text-blue-500" />
        <span className="text-sm">Memuat status impor dokumen...</span>
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
      label: "Mengunduh dari Google Drive",
      description: "Mengambil aliran biner berkas PDF/DOCX",
    },
    {
      id: "extracting",
      label: "Ekstraksi Teks & Metadata",
      description: "Membedah teks per halaman dan struktur dokumen",
    },
    {
      id: "extracted",
      label: "Siap untuk Sitasi & RAG",
      description: "Teks tersimpan & diteruskan ke antrean indeks",
    },
  ];

  const getStepState = (stepId: string) => {
    if (import_status === "failed") {
      if (stepId === "importing") return "completed";
      return "failed";
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
    <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col gap-5 text-slate-100">
      {/* File Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <FileText size={20} weight="duotone" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{file_name}</h3>
            <p className="text-[11px] text-slate-400 font-mono">ID: {documentId}</p>
          </div>
        </div>
        <div>
          {isCompleted && (
            <Badge variant="success" className="gap-1">
              <CheckCircle size={14} weight="fill" />
              <span>Selesai Diekstrak</span>
            </Badge>
          )}
          {isFailed && (
            <Badge variant="destructive" className="gap-1">
              <WarningOctagon size={14} weight="fill" />
              <span>Gagal</span>
            </Badge>
          )}
          {!isCompleted && !isFailed && (
            <Badge variant="info" className="gap-1">
              <CircleNotch size={14} className="animate-spin" />
              <span>Memproses...</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step, idx) => {
          const state = getStepState(step.id);
          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-lg border flex flex-col gap-1.5 transition-all ${
                state === "completed"
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                  : state === "active"
                  ? "bg-blue-950/30 border-blue-500/50 text-blue-200 shadow-sm"
                  : state === "failed"
                  ? "bg-red-950/20 border-red-500/30 text-red-300"
                  : "bg-slate-800/30 border-slate-800 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider">
                  Langkah {idx + 1}
                </span>
                {state === "completed" && (
                  <CheckCircle size={16} weight="fill" className="text-emerald-400" />
                )}
                {state === "active" && (
                  <CircleNotch size={16} className="animate-spin text-blue-400" />
                )}
                {state === "failed" && (
                  <WarningOctagon size={16} weight="fill" className="text-red-400" />
                )}
                {state === "pending" && <Clock size={16} className="text-slate-600" />}
              </div>
              <p className="text-xs font-semibold text-slate-200 leading-snug">
                {step.label}
              </p>
              <p className="text-[11px] text-slate-400 leading-tight">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Failure reason and Retry button */}
      {isFailed && (
        <div className="p-4 bg-red-950/30 border border-red-500/40 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <WarningOctagon size={20} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-200">
                Gagal Mengimpor Dokumen
              </p>
              <p className="text-xs text-red-300/90 mt-0.5">
                {failure_reason || "Terjadi kesalahan saat memproses berkas."}
              </p>
              {retryError && (
                <p className="text-[11px] text-red-400 mt-1">{retryError}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-xs shrink-0 gap-1.5 h-8"
          >
            {isRetrying ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <ArrowClockwise size={14} weight="bold" />
            )}
            <span>{isRetrying ? "Mengulang..." : "Coba Lagi"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
