"use client";

import React from "react";
import {
  X,
  ArrowsClockwise,
  Warning,
  Archive,
  ArrowRight,
  ShieldCheck,
} from "@phosphor-icons/react";

interface ReindexConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName?: string;
  isLoading?: boolean;
}

export function ReindexConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  isLoading = false,
}: ReindexConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <ArrowsClockwise weight="bold" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Konfirmasi Re-index Dokumen
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">
                {fileName || "Dokumen Pustaka"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X weight="bold" className="w-4 h-4" />
          </button>
        </div>

        {/* Body Description */}
        <div className="p-6 space-y-4 text-sm text-slate-600">
          <p className="text-xs leading-relaxed">
            Apakah Anda yakin ingin melakukan re-index pada dokumen ini? Proses ini akan memperbarui potongan chunk dan vektor embedding.
          </p>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-700 font-medium">
              <Archive weight="duotone" className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <span>Pengarsipan Aman (Scientific Audit Trail)</span>
            </div>
            <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
              Vektor index aktif saat ini akan ditandai sebagai <strong>Archived</strong> dan tetap tersimpan utuh di sistem untuk kebutuhan audit ilmiah manuskrip. Tidak ada chunk yang dihapus secara otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200/60">
            <ShieldCheck weight="fill" className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Versi index baru akan dibuat dan diproses di latar belakang.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-200/60 disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <ArrowsClockwise weight="bold" className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Memproses..." : "Lanjutkan Re-index"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
