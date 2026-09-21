import React from "react";
import { DriveFile } from "@/types/drive";
import { DriveFileIcon } from "./DriveFileIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaretRight, ArrowRight } from "@phosphor-icons/react";

interface DriveFileRowProps {
  file: DriveFile;
  isSelected?: boolean;
  onSelectFile?: (file: DriveFile) => void;
  onOpenFolder?: (folderId: string, folderName: string) => void;
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes === 0) return "-";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function DriveFileRow({
  file,
  isSelected,
  onSelectFile,
  onOpenFolder,
}: DriveFileRowProps) {
  if (file.is_folder) {
    return (
      <tr
        onClick={() => onOpenFolder?.(file.id, file.name)}
        className="group cursor-pointer border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
      >
        <td className="py-3 px-4 w-10">
          <DriveFileIcon isFolder={true} />
        </td>
        <td className="py-3 px-4 text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
          <div className="flex items-center gap-2">
            <span>{file.name}</span>
          </div>
        </td>
        <td className="py-3 px-4 text-xs text-slate-400">
          <Badge variant="outline" className="border-slate-700/60 text-slate-400">
            Folder
          </Badge>
        </td>
        <td className="py-3 px-4 text-xs text-slate-400">-</td>
        <td className="py-3 px-4 text-xs text-slate-400">{formatDate(file.modified_at)}</td>
        <td className="py-3 px-4 text-right">
          <CaretRight size={16} className="inline text-slate-500 group-hover:text-slate-300 transition-colors" />
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={`border-b border-slate-800/60 transition-colors ${
        isSelected
          ? "bg-blue-950/30 hover:bg-blue-950/40"
          : file.can_import
          ? "hover:bg-slate-800/30"
          : "opacity-45 hover:bg-transparent"
      }`}
    >
      <td className="py-3 px-4 w-10">
        <DriveFileIcon mimeType={file.mime_type} fileType={file.file_type} />
      </td>
      <td className="py-3 px-4 text-sm font-medium text-slate-200">
        <span className={file.can_import ? "text-slate-100" : "text-slate-400"}>
          {file.name}
        </span>
      </td>
      <td className="py-3 px-4 text-xs">
        {file.file_type === "pdf" && (
          <Badge variant="default" className="bg-rose-500/20 text-rose-300 border-rose-500/30">
            PDF
          </Badge>
        )}
        {file.file_type === "docx" && (
          <Badge variant="default" className="bg-sky-500/20 text-sky-300 border-sky-500/30">
            DOCX
          </Badge>
        )}
        {!file.file_type && (
          <Badge variant="outline" className="text-slate-500 border-slate-800">
            Lainnya
          </Badge>
        )}
      </td>
      <td className="py-3 px-4 text-xs text-slate-400">{formatBytes(file.size_bytes)}</td>
      <td className="py-3 px-4 text-xs text-slate-400">{formatDate(file.modified_at)}</td>
      <td className="py-3 px-4 text-right">
        {file.can_import ? (
          <Button
            size="sm"
            variant={isSelected ? "default" : "secondary"}
            onClick={() => onSelectFile?.(file)}
            className="text-xs h-7 px-2.5 gap-1"
          >
            <span>{isSelected ? "Terpilih" : "Pilih"}</span>
            <ArrowRight size={12} weight="bold" />
          </Button>
        ) : (
          <span className="text-[11px] text-slate-500 italic">Tidak didukung</span>
        )}
      </td>
    </tr>
  );
}
