"use client";

import React, { useState } from "react";
import { DriveFile } from "@/types/drive";
import { importDocument, DocumentApiError } from "@/lib/api/documents";
import { DriveFileIcon } from "./DriveFileIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileArrowDown,
  Warning,
  X,
  CircleNotch,
} from "@phosphor-icons/react";

interface ImportConfirmModalProps {
  file: DriveFile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (documentId: string) => void;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return "-";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ImportConfirmModal({
  file,
  isOpen,
  onClose,
  onSuccess,
}: ImportConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceReimport, setForceReimport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!file.file_type) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await importDocument({
        drive_file_id: file.id,
        file_name: file.name,
        file_type: file.file_type,
        file_size_bytes: file.size_bytes ?? undefined,
        force_reimport: forceReimport,
      });

      onSuccess(response.document_id);
    } catch (err: any) {
      if (err instanceof DocumentApiError && err.statusCode === 409) {
        setIsDuplicate(true);
        setErrorMessage(
          err.message || "Dokumen dengan konten identik sudah pernah diimpor."
        );
      } else {
        setErrorMessage(
          err.message || "Gagal mengimpor berkas. Silakan coba lagi."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded border border-[#e5e7eb] bg-white p-6 shadow-2xl flex flex-col gap-4 text-left">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center">
              <FileArrowDown size={20} weight="regular" />
            </div>
            <div>
              <h2 className="font-sans text-base font-semibold text-[#1c1b1b]">
                Konfirmasi Impor Dokumen
              </h2>
              <p className="text-xs text-[#434655]">
                Pustaka telaah akan mengekstrak teks untuk keperluan sitasi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[#747686] hover:text-[#1c1b1b] p-1 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* File Metadata Preview */}
        <div className="p-3 bg-[#f7f6f3] border border-[#e5e7eb] rounded flex items-center gap-3">
          <DriveFileIcon mimeType={file.mime_type} fileType={file.file_type} size={24} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#1c1b1b] truncate font-sans">
              {file.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] uppercase font-sans font-medium border-[#e5e7eb] bg-white text-[#747686]">
                {file.file_type}
              </Badge>
              <span className="text-[11px] font-sans text-[#747686]">
                {formatBytes(file.size_bytes)}
              </span>
            </div>
          </div>
        </div>

        {/* Read-Only Security Notice */}
        <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded text-xs text-[#1d4ed8] leading-relaxed">
          <strong className="font-semibold text-[#1e40af]">Keamanan Privasi:</strong> Telaah hanya membaca aliran biner berkas ini. Berkas asli Anda di Google Drive tidak akan pernah dimodifikasi atau dihapus.
        </div>

        {/* Duplicate Warning / Force Re-import */}
        {isDuplicate && (
          <div className="p-3 bg-[#fffbeb] border border-[#fed7aa] rounded flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#b45309] text-xs font-semibold">
              <Warning size={15} weight="bold" />
              <span>Dokumen Duplikat Terdeteksi</span>
            </div>
            <p className="text-xs text-[#b45309]">
              {errorMessage} Centang opsi di bawah jika Anda ingin mengekstrak ulang dokumen ini.
            </p>
            <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceReimport}
                onChange={(e) => setForceReimport(e.target.checked)}
                className="rounded border-[#fed7aa] text-[#1d4ed8] focus:ring-[#1d4ed8] w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-medium text-[#1c1b1b]">
                Timpah dan ekstrak ulang dokumen ini
              </span>
            </label>
          </div>
        )}

        {/* Generic Error */}
        {!isDuplicate && errorMessage && (
          <div className="p-3 bg-[#ffdad6]/40 border border-[#ffdad6] rounded text-xs text-[#ba1a1a]">
            {errorMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e7eb]">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs cursor-pointer border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] rounded"
          >
            Batal
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleImport}
            disabled={isSubmitting}
            className="text-xs gap-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white cursor-pointer shadow-2xs rounded"
          >
            {isSubmitting && <CircleNotch size={13} className="animate-spin" />}
            <span>{isSubmitting ? "Mengimpor Dokumen..." : isDuplicate && forceReimport ? "Impor Ulang Dokumen" : "Impor Dokumen"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
