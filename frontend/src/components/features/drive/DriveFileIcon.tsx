import React from "react";
import { FilePdf, FileDoc, Folder, File } from "@phosphor-icons/react";

interface DriveFileIconProps {
  mimeType?: string;
  fileType?: "pdf" | "docx" | null;
  isFolder?: boolean;
  className?: string;
  size?: number;
}

export function DriveFileIcon({
  mimeType,
  fileType,
  isFolder,
  className = "w-5 h-5",
  size = 20,
}: DriveFileIconProps) {
  if (isFolder || mimeType === "application/vnd.google-apps.folder") {
    return <Folder size={size} weight="duotone" className={`text-amber-400 shrink-0 ${className}`} />;
  }

  if (fileType === "pdf" || mimeType === "application/pdf") {
    return <FilePdf size={size} weight="duotone" className={`text-rose-400 shrink-0 ${className}`} />;
  }

  if (
    fileType === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return <FileDoc size={size} weight="duotone" className={`text-sky-400 shrink-0 ${className}`} />;
  }

  return <File size={size} weight="duotone" className={`text-slate-400 shrink-0 ${className}`} />;
}
