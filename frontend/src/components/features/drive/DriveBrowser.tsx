"use client";

import React, { useState } from "react";
import { useDriveFiles } from "@/hooks/useDriveFiles";
import { DriveFile } from "@/types/drive";
import { DriveFileRow } from "./DriveFileRow";
import { Button } from "@/components/ui/button";
import {
  MagnifyingGlass,
  ArrowClockwise,
  WarningCircle,
  CaretRight,
  Folder,
  CircleNotch,
} from "@phosphor-icons/react";

interface DriveBrowserProps {
  onSelectFile: (file: DriveFile) => void;
  selectedFileId?: string;
}

export function DriveBrowser({ onSelectFile, selectedFileId }: DriveBrowserProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "importable">("all");

  const {
    files,
    folderPath,
    isLoading,
    error,
    errorCode,
    navigateToFolder,
    loadMore,
    nextPageToken,
    refetch,
  } = useDriveFiles({
    searchQuery,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType === "importable") {
      return f.can_import || f.is_folder;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white border border-[#e5e7eb] rounded overflow-hidden shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_-1px_rgba(15,23,42,0.02)]">
      {/* Top Toolbar: Breadcrumbs & Search */}
      <div className="p-3.5 border-b border-[#e5e7eb] bg-[#f7f6f3] flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Breadcrumbs */}
        <nav className="flex items-center flex-wrap gap-1 text-xs text-[#434655]">
          <Folder size={16} weight="regular" className="text-[#b45309] mr-1 shrink-0" />
          {folderPath.map((folder, index) => {
            const isLast = index === folderPath.length - 1;
            return (
              <React.Fragment key={folder.id}>
                {index > 0 && (
                  <CaretRight size={12} className="text-[#747686] shrink-0 mx-0.5" />
                )}
                {isLast ? (
                  <span className="font-semibold text-[#1c1b1b] px-1 py-0.5 rounded font-serif">
                    {folder.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateToFolder(folder.id)}
                    className="hover:text-[#1d4ed8] px-1 py-0.5 rounded transition-colors text-[#434655] font-sans cursor-pointer"
                  >
                    {folder.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Search bar & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <MagnifyingGlass
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#747686]"
            />
            <input
              type="text"
              placeholder="Cari berkas di Drive..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#e5e7eb] rounded text-[#1c1b1b] placeholder:text-[#747686] focus:outline-none focus:border-[#1d4ed8] transition-colors"
            />
          </form>

          <Button
            size="sm"
            variant="outline"
            onClick={refetch}
            disabled={isLoading}
            className="h-7.5 w-7.5 p-0 shrink-0 border-[#e5e7eb] bg-white text-[#1c1b1b] hover:bg-[#f7f6f3]"
            title="Muat ulang"
          >
            <ArrowClockwise
              size={14}
              className={isLoading ? "animate-spin text-[#1d4ed8]" : "text-[#747686]"}
            />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-[#e5e7eb] bg-[#f7f6f3] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer ${
              filterType === "all"
                ? "bg-white text-[#1d4ed8] font-semibold border border-[#e5e7eb] shadow-2xs"
                : "text-[#434655] hover:text-[#1c1b1b]"
            }`}
          >
            Semua Berkas
          </button>
          <button
            type="button"
            onClick={() => setFilterType("importable")}
            className={`px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer ${
              filterType === "importable"
                ? "bg-white text-[#1d4ed8] font-semibold border border-[#e5e7eb] shadow-2xs"
                : "text-[#434655] hover:text-[#1c1b1b]"
            }`}
          >
            Dapat Diimpor (PDF & DOCX)
          </button>
        </div>
        <span className="text-[#747686] text-[11px] font-mono">
          {filteredFiles.length} berkas ditemukan
        </span>
      </div>

      {/* File List Content */}
      <div className="flex-1 overflow-auto min-h-[350px]">
        {errorCode === "DRIVE_TOKEN_REVOKED" ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="w-10 h-10 rounded bg-[#fffbeb] text-[#b45309] border border-[#fed7aa] flex items-center justify-center mb-3">
              <WarningCircle size={24} weight="regular" />
            </div>
            <h3 className="font-serif text-base font-semibold text-[#1c1b1b] mb-1">
              Akses Google Drive Perlu Dihubungkan Ulang
            </h3>
            <p className="text-xs text-[#434655] max-w-md mb-4">
              Izin akses Google Drive Anda telah kedaluwarsa atau dicabut. Silakan hubungkan kembali akun Google Anda.
            </p>
            <Button
              variant="default"
              onClick={() => (window.location.href = "/auth/google/login?prompt=consent")}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white"
            >
              Hubungkan Ulang Google Drive
            </Button>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <WarningCircle size={28} className="text-[#ba1a1a] mb-2" />
            <p className="text-xs text-[#1c1b1b] mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Coba Lagi
            </Button>
          </div>
        ) : isLoading && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-[#747686] h-full">
            <CircleNotch size={28} className="animate-spin text-[#1d4ed8] mb-2" />
            <p className="text-xs">Memuat daftar berkas dari Google Drive...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-[#747686] h-full">
            <Folder size={36} weight="thin" className="text-[#747686] mb-2" />
            <p className="text-xs font-medium text-[#1c1b1b]">Tidak ada berkas</p>
            <p className="text-[11px] text-[#747686]">
              {searchQuery
                ? "Tidak ada berkas yang sesuai dengan kata kunci pencarian."
                : "Folder ini tidak berisi berkas atau folder."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-[10.5px] font-mono font-semibold text-[#747686] uppercase tracking-wider bg-[#f7f6f3] sticky top-0">
                <th className="py-2.5 px-4 w-10"></th>
                <th className="py-2.5 px-4">Nama</th>
                <th className="py-2.5 px-4">Tipe</th>
                <th className="py-2.5 px-4">Ukuran</th>
                <th className="py-2.5 px-4">Diubah</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => (
                <DriveFileRow
                  key={file.id}
                  file={file}
                  isSelected={file.id === selectedFileId}
                  onSelectFile={onSelectFile}
                  onOpenFolder={navigateToFolder}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Load More */}
      {nextPageToken && (
        <div className="p-3 border-t border-[#e5e7eb] bg-[#f7f6f3] flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
            className="text-xs border-[#e5e7eb] bg-white text-[#1c1b1b]"
          >
            {isLoading ? "Memuat..." : "Muat Lebih Banyak Berkas"}
          </Button>
        </div>
      )}
    </div>
  );
}
