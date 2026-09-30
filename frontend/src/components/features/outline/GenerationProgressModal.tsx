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
    title: "1. Penyiapan Konteks & Template",
    description: "Membaca konfigurasi heading IEEE dan spesifikasi bagian dari template iciCos.",
    icon: Article,
  },
  {
    id: "reading",
    title: "2. Retrieval Chunks Terarah",
    description: "Pencarian kemiripan kosinus (pgvector) terhadap topik riset, metodologi, dan gap.",
    icon: Database,
  },
  {
    id: "generating",
    title: "3. Sintesis Field dengan LLM",
    description: "Menyusun field IMRaD dengan Gemini 2.0 Flash dan menyematkan penanda [NEEDS INPUT].",
    icon: Cpu,
  },
  {
    id: "validating",
    title: "4. Validasi Struktur & Integritas",
    description: "Memverifikasi seluruh heading mandatory dan urutan sekuensial sesuai template.",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#fcf9f8] rounded-2xl shadow-2xl border border-[#d1c7bd] overflow-hidden text-left">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e8e2dc] bg-[#f9f5f2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8effd] text-[#0037b0] flex items-center justify-center">
              <Sparkle size={20} weight="fill" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#2c2623]">
                {isReady
                  ? "Outline Berhasil Dibuat"
                  : isFailed
                  ? "Generasi Outline Gagal"
                  : "Menghasilkan Outline Paper"}
              </h3>
              <p className="text-xs text-[#786f66] font-mono">
                Model: iciCos IEEE 2-Column Template
              </p>
            </div>
          </div>

          {(isReady || isFailed) && (
            <button
              onClick={onClose}
              className="text-[#8c827a] hover:text-[#2c2623] p-1.5 rounded-lg hover:bg-[#ede7e1] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Stepper Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            {STEPS.map((step) => {
              const state = getStepStatus(step.id);
              const StepIcon = step.icon;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all ${
                    state === "active"
                      ? "bg-white border-[#0037b0]/30 shadow-sm"
                      : state === "completed"
                      ? "bg-[#f5f9f6] border-[#006c4a]/20"
                      : state === "failed"
                      ? "bg-[#fff5f5] border-[#ba1a1a]/30"
                      : "bg-[#fbf9f6] border-[#e8e2dc]/60 opacity-60"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {state === "completed" && (
                      <CheckCircle size={20} className="text-[#006c4a]" weight="fill" />
                    )}
                    {state === "active" && (
                      <CircleNotch size={20} className="text-[#0037b0] animate-spin" />
                    )}
                    {state === "failed" && (
                      <WarningCircle size={20} className="text-[#ba1a1a]" weight="fill" />
                    )}
                    {state === "pending" && (
                      <div className="w-5 h-5 rounded-full border-2 border-[#d1c7bd] flex items-center justify-center text-[10px] font-mono text-[#8c827a]">
                        <StepIcon size={12} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold leading-tight ${
                        state === "active"
                          ? "text-[#0037b0]"
                          : state === "completed"
                          ? "text-[#006c4a]"
                          : state === "failed"
                          ? "text-[#ba1a1a]"
                          : "text-[#544c45]"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-[#786f66] mt-0.5 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Status Banner */}
          {!isFailed && !isReady && (
            <div className="p-3.5 rounded-xl bg-[#e8effd]/50 border border-[#0037b0]/15 flex items-center gap-2.5">
              <CircleNotch size={18} className="text-[#0037b0] animate-spin shrink-0" />
              <p className="text-xs text-[#0037b0] font-medium font-mono">
                {progressLabel || "Sedang memproses langkah..."}
              </p>
            </div>
          )}

          {/* Failure message */}
          {isFailed && (
            <div className="p-4 rounded-xl bg-[#fff5f5] border border-[#ba1a1a]/30 space-y-2">
              <div className="flex items-center gap-2 text-[#ba1a1a]">
                <WarningCircle size={18} weight="fill" />
                <span className="text-xs font-semibold">Kesalahan Pemrosesan</span>
              </div>
              <p className="text-xs text-[#544c45] font-mono break-all leading-relaxed">
                {failureReason || "Terjadi kesalahan saat berkomunikasi dengan LLM synthesizer atau membaca template."}
              </p>
            </div>
          )}

          {/* Ready notification */}
          {isReady && (
            <div className="p-4 rounded-xl bg-[#f0fdf4] border border-[#006c4a]/30 space-y-1">
              <div className="flex items-center gap-2 text-[#006c4a]">
                <CheckCircle size={18} weight="fill" />
                <span className="text-xs font-semibold">Outline Siap untuk Direview</span>
              </div>
              <p className="text-xs text-[#544c45] leading-relaxed">
                Struktur IMRaD telah berhasil disintesis sesuai batasan template iciCos. Anda dapat mulai menelaah dan mengedit tiap field di Academic Editorial Canvas.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#e8e2dc] bg-[#f9f5f2] flex items-center justify-between">
          <span className="text-xs text-[#8c827a] font-mono">
            {isReady ? "Status: Selesai" : isFailed ? "Status: Gagal" : "Estimasi: ~15-30 detik"}
          </span>

          <div className="flex items-center gap-2">
            {isFailed && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ba1a1a] text-white text-xs font-semibold hover:bg-[#931515] transition-colors"
              >
                <ArrowClockwise size={16} />
                <span>Coba Lagi</span>
              </button>
            )}

            {isReady && onNavigateToCanvas && (
              <button
                onClick={onNavigateToCanvas}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0037b0] text-white text-xs font-semibold hover:bg-[#002b8a] transition-colors shadow-sm"
              >
                <span>Buka di Canvas Editor</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
