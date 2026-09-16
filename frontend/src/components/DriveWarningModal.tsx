"use client";

import React from "react";
import { Warning, ArrowRight, X, ShieldCheck } from "@phosphor-icons/react";
import { getGoogleLoginUrl } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DriveWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ponytail: Modal dialog for Google Drive scope re-consent using Tailwind & Phosphor icons
 */
export function DriveWarningModal({ isOpen, onClose }: DriveWarningModalProps) {
  if (!isOpen) return null;

  const handleGrantAccess = () => {
    window.location.href = getGoogleLoginUrl("consent");
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md"
          aria-label="Tutup"
        >
          <X size={18} weight="bold" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Warning size={24} weight="duotone" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Otorisasi Google Drive Diperlukan
            </h3>
            <Badge variant="warning" className="mt-1">
              Izin Baca Terbatas
            </Badge>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          Platform membutuhkan akses baca (<em>read-only</em>) ke Google Drive Anda untuk mengekstrak literatur referensi,
          membuat indeks semantik vektor (<em>pgvector</em>), dan memvalidasi sitasi draf paper jurnal secara presisi.
        </p>

        <div className="rounded-lg bg-slate-950 border border-slate-800/80 p-3.5 mb-6 flex items-start gap-2.5 text-xs text-slate-400">
          <ShieldCheck size={20} weight="fill" className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Scope <code className="text-blue-400 bg-slate-900 px-1 py-0.5 rounded">drive.readonly</code>: Platform <strong>hanya membaca</strong> dokumen yang Anda tentukan dan tidak dapat memodifikasi atau menghapus file Anda.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Nanti Saja
          </Button>
          <Button variant="default" onClick={handleGrantAccess} className="bg-blue-600 hover:bg-blue-700 text-white">
            <span>Beri Izin Akses Drive</span>
            <ArrowRight size={16} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  );
}
