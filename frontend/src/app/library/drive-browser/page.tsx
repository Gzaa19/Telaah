"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DriveBrowser } from "@/components/features/drive/DriveBrowser";
import { DriveFile } from "@/types/drive";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GoogleLogo } from "@phosphor-icons/react";
import { ImportConfirmModal } from "@/components/features/drive/ImportConfirmModal";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

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
    <WorkspaceLayout>
      <div className="flex-1 w-full px-5 md:px-6 py-5 md:py-6 flex flex-col gap-6 bg-[#fcf9f8]">
        {/* Header navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3 text-left">
            <Link href="/library">
              <Button variant="outline" size="sm" className="h-8.5 w-8.5 p-0 rounded border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] shadow-2xs">
                <ArrowLeft size={16} />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1c1b1b]">
                  Pilih Berkas dari Google Drive
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] px-2 py-0.5 rounded">
                  <GoogleLogo size={12} weight="bold" />
                  <span>Google Drive</span>
                </span>
              </div>
              <p className="text-xs text-[#434655] mt-0.5">
                Pilih artikel riset atau manuskrip (format PDF / DOCX) untuk diimpor ke pustaka referensi Telaah.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/library">
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-[#e5e7eb] bg-white text-[#1c1b1b] hover:bg-[#f7f6f3] shadow-2xs rounded">
                Pustaka Dokumen
              </Button>
            </Link>
          </div>
        </div>

        {/* Browser Component */}
        <div className="flex-1">
          <DriveBrowser
            onSelectFile={handleSelectFile}
            selectedFileId={selectedFile?.id}
          />
        </div>

        {/* Modal wired component */}
        {selectedFile && (
          <ImportConfirmModal
            file={selectedFile}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleImportSuccess}
          />
        )}
      </div>
    </WorkspaceLayout>
  );
}
