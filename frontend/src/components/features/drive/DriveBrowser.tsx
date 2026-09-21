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
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Toolbar: Breadcrumbs & Search */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Breadcrumbs */}
        <nav className="flex items-center flex-wrap gap-1 text-sm text-slate-400">
          <Folder size={18} weight="duotone" className="text-amber-400 mr-1 shrink-0" />
          {folderPath.map((folder, index) => {
            const isLast = index === folderPath.length - 1;
            return (
              <React.Fragment key={folder.id}>
                {index > 0 && (
                  <CaretRight size={14} className="text-slate-600 shrink-0 mx-0.5" />
                )}
                {isLast ? (
                  <span className="font-semibold text-slate-100 px-1 py-0.5 rounded">
                    {folder.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateToFolder(folder.id)}
                    className="hover:text-blue-400 px-1 py-0.5 rounded transition-colors text-slate-300"
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
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari berkas di Drive..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </form>

          <Button
            size="sm"
            variant="outline"
            onClick={refetch}
            disabled={isLoading}
            className="h-8 w-8 p-0 shrink-0"
            title="Muat ulang"
          >
            <ArrowClockwise
              size={16}
              className={isLoading ? "animate-spin text-blue-400" : "text-slate-300"}
            />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterType === "all"
                ? "bg-slate-800 text-blue-400 font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Semua Berkas
          </button>
          <button
            type="button"
            onClick={() => setFilterType("importable")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterType === "importable"
                ? "bg-slate-800 text-blue-400 font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Dapat Diimpor (PDF & DOCX)
          </button>
        </div>
        <span className="text-slate-500 text-[11px]">
          {filteredFiles.length} berkas ditemukan
        </span>
      </div>

      {/* File List Content */}
      <div className="flex-1 overflow-auto min-h-[350px]">
        {errorCode === "DRIVE_TOKEN_REVOKED" ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <WarningCircle size={28} weight="duotone" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">
              Akses Google Drive Perlu Dihubungkan Ulang
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-4">
              Izin akses Google Drive Anda telah kedaluwarsa atau dicabut. Silakan hubungkan kembali akun Google Anda.
            </p>
            <Button
              variant="default"
              onClick={() => (window.location.href = "/auth/google/login?prompt=consent")}
            >
              Hubungkan Ulang Google Drive
            </Button>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full">
            <WarningCircle size={28} className="text-red-400 mb-2" />
            <p className="text-sm text-slate-300 mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={refetch}>
              Coba Lagi
            </Button>
          </div>
        ) : isLoading && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full">
            <CircleNotch size={32} className="animate-spin text-blue-500 mb-2" />
            <p className="text-sm">Memuat daftar berkas dari Google Drive...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 h-full">
            <Folder size={40} weight="thin" className="text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">Tidak ada berkas</p>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? "Tidak ada berkas yang sesuai dengan kata kunci pencarian."
                : "Folder ini tidak berisi berkas atau folder."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/60 sticky top-0">
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
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
            className="text-xs"
          >
            {isLoading ? "Memuat..." : "Muat Lebih Banyak Berkas"}
          </Button>
        </div>
      )}
    </div>
  );
}
