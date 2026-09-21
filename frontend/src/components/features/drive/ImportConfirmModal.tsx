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
      if (err instanceof DocumentApiError) {
        if (err.statusCode === 409 || err.errorCode === "DUPLICATE_DOCUMENT") {
          setIsDuplicate(true);
          setErrorMessage("Dokumen ini telah diimpor sebelumnya ke Telaah.");
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage(err.message || "Gagal mengimpor dokumen.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 flex flex-col gap-5 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileArrowDown size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Konfirmasi Impor Dokumen
              </h2>
              <p className="text-xs text-slate-400">
                Pustaka telaah akan mengekstrak teks untuk keperluan sitasi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* File Metadata Preview */}
        <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-lg flex items-center gap-3">
          <DriveFileIcon mimeType={file.mime_type} fileType={file.file_type} size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {file.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-slate-700">
                {file.file_type}
              </Badge>
              <span className="text-xs text-slate-400">
                {formatBytes(file.size_bytes)}
              </span>
            </div>
          </div>
        </div>

        {/* Duplicate Warning / Force Re-import */}
        {isDuplicate && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Warning size={16} weight="bold" />
              <span>Dokumen Duplikat Terdeteksi</span>
            </div>
            <p className="text-xs text-amber-200/90">
              {errorMessage} Centang opsi di bawah jika Anda ingin mengekstrak ulang dokumen ini.
            </p>
            <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceReimport}
                onChange={(e) => setForceReimport(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-xs font-medium text-slate-200">
                Timpah dan ekstrak ulang dokumen ini
              </span>
            </label>
          </div>
        )}

        {/* Generic Error */}
        {!isDuplicate && errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleImport}
            disabled={isSubmitting}
            className="text-xs gap-1.5"
          >
            {isSubmitting && <CircleNotch size={14} className="animate-spin" />}
            <span>{isSubmitting ? "Mengimpor..." : isDuplicate && forceReimport ? "Impor Ulang" : "Impor Sekarang"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
