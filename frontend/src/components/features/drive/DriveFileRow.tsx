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
        className="group cursor-pointer border-b border-[#f0eded] hover:bg-[#f7f6f3] transition-colors"
      >
        <td className="py-2.5 px-4 w-10">
          <DriveFileIcon isFolder={true} />
        </td>
        <td className="py-2.5 px-4 text-xs font-medium text-[#1c1b1b] group-hover:text-[#1d4ed8] transition-colors font-sans">
          <div className="flex items-center gap-2">
            <span>{file.name}</span>
          </div>
        </td>
        <td className="py-2.5 px-4 text-xs text-[#747686]">
          <Badge variant="outline" className="border-[#e5e7eb] text-[#747686] bg-white font-sans font-medium text-[10px]">
            Folder
          </Badge>
        </td>
        <td className="py-2.5 px-4 text-xs font-sans text-[#747686]">-</td>
        <td className="py-2.5 px-4 text-xs font-sans text-[#747686]">{formatDate(file.modified_at)}</td>
        <td className="py-2.5 px-4 text-right">
          <CaretRight size={14} className="inline text-[#747686] group-hover:text-[#1c1b1b] transition-colors" />
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={`border-b border-[#f0eded] transition-colors ${
        isSelected
          ? "bg-[#eff6ff] hover:bg-[#dbeafe]"
          : file.can_import
          ? "hover:bg-[#f7f6f3]"
          : "opacity-45 hover:bg-transparent"
      }`}
    >
      <td className="py-2.5 px-4 w-10">
        <DriveFileIcon mimeType={file.mime_type} fileType={file.file_type} />
      </td>
      <td className="py-2.5 px-4 text-xs font-medium text-[#1c1b1b]">
        <span className={file.can_import ? "text-[#1c1b1b]" : "text-[#747686]"}>
          {file.name}
        </span>
      </td>
      <td className="py-2.5 px-4 text-xs">
        {file.file_type === "pdf" && (
          <Badge variant="secondary" className="bg-[#ffdad6]/60 text-[#ba1a1a] border border-[#ffdad6] font-sans font-medium text-[10px]">
            PDF
          </Badge>
        )}
        {file.file_type === "docx" && (
          <Badge variant="secondary" className="bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] font-sans font-medium text-[10px]">
            DOCX
          </Badge>
        )}
        {!file.file_type && (
          <Badge variant="outline" className="text-[#747686] border-[#e5e7eb] font-sans font-medium text-[10px]">
            Lainnya
          </Badge>
        )}
      </td>
      <td className="py-2.5 px-4 text-xs font-sans text-[#747686]">{formatBytes(file.size_bytes)}</td>
      <td className="py-2.5 px-4 text-xs font-sans text-[#747686]">{formatDate(file.modified_at)}</td>
      <td className="py-2.5 px-4 text-right">
        {file.can_import ? (
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            onClick={() => onSelectFile?.(file)}
            className={`text-xs h-6.5 px-2 gap-1 rounded ${
              isSelected
                ? "bg-[#1d4ed8] text-white"
                : "border-[#e5e7eb] bg-white text-[#1c1b1b] hover:bg-[#f7f6f3]"
            }`}
          >
            <span>{isSelected ? "Terpilih" : "Pilih"}</span>
            <ArrowRight size={11} weight="bold" />
          </Button>
        ) : (
          <span className="text-[11px] text-[#747686] italic font-sans">Tidak didukung</span>
        )}
      </td>
    </tr>
  );
}
