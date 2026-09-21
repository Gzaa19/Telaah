"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DriveBrowser } from "@/components/features/drive/DriveBrowser";
import { DriveFile } from "@/types/drive";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GoogleLogo } from "@phosphor-icons/react";
import { ImportConfirmModal } from "@/components/features/drive/ImportConfirmModal";

export default function DriveBrowserPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectFile = (file: DriveFile) => {
    setSelectedFile(file);
    setIsModalOpen(true);
  };

  const handleImportSuccess = (documentId: string) => {
    setIsModalOpen(false);
    router.push(`/library?importing_id=${documentId}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/library">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Pilih Berkas dari Google Drive
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  <GoogleLogo size={12} weight="bold" />
                  <span>Google Drive</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilih artikel riset atau manuskrip (format PDF / DOCX) untuk diimpor ke pustaka referensi Telaah.
              </p>
            </div>
          </div>
        </div>

        {/* Browser Component */}
        <div className="flex-1">
          <DriveBrowser
            onSelectFile={handleSelectFile}
            selectedFileId={selectedFile?.id}
          />
        </div>

        {/* Modal placeholder or wired component */}
        {selectedFile && (
          <ImportConfirmModal
            file={selectedFile}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleImportSuccess}
          />
        )}
      </div>
    </div>
  );
}
