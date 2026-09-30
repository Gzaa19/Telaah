"use client";

import React from "react";
import {
  CircleNotch,
  CheckCircle,
  WarningCircle,
  Sparkle,
  X,
  ArrowClockwise,
  ArrowRight,
  Article,
  Database,
  ShieldCheck,
  Cpu,
} from "@phosphor-icons/react";
import { GenerationStatusEnum } from "@/types/outlines";

interface GenerationProgressModalProps {
  isOpen: boolean;
  status: GenerationStatusEnum;
  progressLabel: string;
  failureReason?: string | null;
  onClose: () => void;
  onRetry?: () => void;
  onNavigateToCanvas?: () => void;
}

interface StepItem {
  id: GenerationStatusEnum;
  title: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: StepItem[] = [
  {
    id: "preparing",
    title: "1. Persiapan Format Template",
    description: "Membaca susunan bab dan format prosiding publikasi.",
    icon: Article,
  },
  {
    id: "reading",
    title: "2. Penelusuran Dokumen Rujukan",
    description: "Menghubungkan konteks literatur riset dengan topik bahasan.",
    icon: Database,
  },
  {
    id: "generating",
    title: "3. Penyusunan Poin Outline",
    description: "Menyusun poin-poin ringkas berbasis sumber literatur yang terverifikasi.",
    icon: Cpu,
  },
  {
    id: "validating",
    title: "4. Pemeriksaan Kelengkapan",
    description: "Memastikan seluruh bagian wajib telah lengkap dan terstruktur.",
    icon: ShieldCheck,
  },
];

export function GenerationProgressModal({
  isOpen,
  status,
  progressLabel,
  failureReason,
  onClose,
  onRetry,
  onNavigateToCanvas,
}: GenerationProgressModalProps) {
  if (!isOpen) return null;

  const getStepStatus = (stepId: GenerationStatusEnum) => {
    const stepOrder: GenerationStatusEnum[] = ["preparing", "reading", "generating", "validating", "ready"];
    const currentIndex = stepOrder.indexOf(status === "failed" ? "validating" : status);
    const stepIndex = stepOrder.indexOf(stepId);

    if (status === "failed" && stepIndex === currentIndex) {
      return "failed";
    }
    if (status === "ready" || stepIndex < currentIndex) {
      return "completed";
    }
    if (stepIndex === currentIndex) {
      return "active";
    }
    return "pending";
  };

  const isFailed = status === "failed";
  const isReady = status === "ready";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-[#e5e7eb] overflow-hidden text-left">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center">
              <Sparkle size={18} weight="fill" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c1b1b]">
                {isReady
                  ? "Outline Siap Ditinjau"
                  : isFailed
                  ? "Penyusunan Outline Gagal"
                  : "Menyusun Kerangka Paper"}
              </h3>
              <p className="text-xs text-[#747686]">
                Template: iciCos 2024 (IEEE Format)
              </p>
            </div>
          </div>

          {(isReady || isFailed) && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        {/* Stepper Content */}
        <div className="p-5 space-y-3.5">
          <div className="space-y-2.5">
            {STEPS.map((step) => {
              const state = getStepStatus(step.id);
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                    state === "active"
                      ? "bg-[#eff6ff]/50 border-[#bfdbfe]"
                      : state === "completed"
                      ? "bg-[#f0fdf4]/50 border-[#bbf7d0]"
                      : state === "failed"
                      ? "bg-[#fff1f2] border-[#fecdd3]"
                      : "bg-[#f7f6f3] border-[#e5e7eb] opacity-60"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {state === "completed" && (
                      <CheckCircle size={18} className="text-[#166534]" weight="fill" />
                    )}
                    {state === "active" && (
                      <CircleNotch size={18} className="text-[#1d4ed8] animate-spin" />
                    )}
                    {state === "failed" && (
                      <WarningCircle size={18} className="text-[#e11d48]" weight="fill" />
                    )}
                    {state === "pending" && (
                      <div className="w-4.5 h-4.5 rounded-full border border-[#d4d4d8] flex items-center justify-center text-[9px] text-[#71717a]">
                        <StepIcon size={11} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold leading-tight ${
                        state === "active"
                          ? "text-[#1d4ed8]"
                          : state === "completed"
                          ? "text-[#166534]"
                          : state === "failed"
                          ? "text-[#e11d48]"
                          : "text-[#52525b]"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-[11px] text-[#71717a] mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Status Banner */}
          {!isFailed && !isReady && (
            <div className="p-2.5 rounded-md bg-[#eff6ff] border border-[#bfdbfe] flex items-center gap-2">
              <CircleNotch size={14} className="text-[#1d4ed8] animate-spin shrink-0" />
              <p className="text-xs text-[#1d4ed8] font-medium">
                {progressLabel || "Sedang memproses outline..."}
              </p>
            </div>
          )}

          {/* Failure message */}
          {isFailed && (
            <div className="p-3 rounded-md bg-[#fff1f2] border border-[#fecdd3] space-y-1">
              <div className="flex items-center gap-1.5 text-[#e11d48]">
                <WarningCircle size={15} weight="fill" />
                <span className="text-xs font-semibold">Gagal Menyusun Outline</span>
              </div>
              <p className="text-xs text-[#71717a] leading-relaxed">
                {failureReason || "Terjadi kendala saat menyusun outline. Silakan periksa dokumen atau coba kembali."}
              </p>
            </div>
          )}

          {/* Ready notification */}
          {isReady && (
            <div className="p-3 rounded-md bg-[#f0fdf4] border border-[#bbf7d0] space-y-1">
              <div className="flex items-center gap-1.5 text-[#166534]">
                <CheckCircle size={15} weight="fill" />
                <span className="text-xs font-semibold">Kerangka Outline Selesai</span>
              </div>
              <p className="text-xs text-[#52525b] leading-relaxed">
                Kerangka outline telah siap beserta kutipan rujukan dokumen. Anda dapat mulai meninjau dan mengedit tiap bagian di kanvas editor.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-[#e5e7eb] bg-[#f7f6f3] flex items-center justify-between">
          <span className="text-[11px] text-[#71717a]">
            {isReady ? "Selesai" : isFailed ? "Gagal" : "Estimasi: ~15-30 detik"}
          </span>

          <div className="flex items-center gap-2">
            {isFailed && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
              >
                <ArrowClockwise size={13} />
                <span>Coba Lagi</span>
              </button>
            )}

            {isReady && onNavigateToCanvas && (
              <button
                type="button"
                onClick={onNavigateToCanvas}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                <span>Buka Editor Outline</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
