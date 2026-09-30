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
 * ponytail: Modal dialog for Google Drive scope re-consent
 * Academic Editorial Canvas light styling
 */
export function DriveWarningModal({ isOpen, onClose }: DriveWarningModalProps) {
  if (!isOpen) return null;

  const handleGrantAccess = () => {
    window.location.href = getGoogleLoginUrl("consent");
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded border border-[#e5e7eb] bg-white p-6 shadow-2xl animate-in fade-in duration-150 text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#747686] hover:text-[#1c1b1b] transition-colors p-1 rounded"
          aria-label="Tutup"
        >
          <X size={16} weight="bold" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded bg-[#fffbeb] text-[#b45309] border border-[#fed7aa]">
            <Warning size={22} weight="regular" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-medium text-[#1c1b1b]">
              Otorisasi Google Drive Diperlukan
            </h3>
            <Badge variant="warning" className="mt-1">
              Izin Baca Terbatas
            </Badge>
          </div>
        </div>

        <p className="text-xs text-[#434655] leading-relaxed mb-4">
          Platform membutuhkan akses baca (<em>read-only</em>) ke Google Drive Anda untuk membaca literatur referensi,
          menyusun indeks penelusuran dokumen, dan memvalidasi sitasi draf paper jurnal secara presisi.
        </p>

        <div className="rounded bg-[#f7f6f3] border border-[#e5e7eb] p-3 mb-5 flex items-start gap-2.5 text-xs text-[#434655]">
          <ShieldCheck size={18} weight="fill" className="text-[#006c4a] shrink-0 mt-0.5" />
          <span>
            Scope <code className="text-[#1d4ed8] bg-white border border-[#e5e7eb] px-1 py-0.5 rounded font-mono text-[11px]">drive.readonly</code>: Platform <strong>hanya membaca</strong> dokumen yang Anda tentukan dan tidak dapat memodifikasi atau menghapus file Anda.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b]"
          >
            Nanti Saja
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleGrantAccess}
            className="text-xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white gap-1.5"
          >
            <span>Beri Izin Akses Drive</span>
            <ArrowRight size={13} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  );
}
