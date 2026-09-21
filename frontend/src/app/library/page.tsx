"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImportProgress } from "@/components/features/drive/ImportProgress";
import { DriveFileIcon } from "@/components/features/drive/DriveFileIcon";
import {
  Plus,
  Books,
  FilePdf,
  FileDoc,
  CircleNotch,
  WarningOctagon,
  CheckCircle,
  ArrowClockwise,
  ArrowRight,
} from "@phosphor-icons/react";

interface DocumentItem {
  id: string;
  google_drive_id: string;
  file_name: string;
  file_type: "pdf" | "docx";
  file_size_bytes: number | null;
  import_status: "importing" | "extracting" | "extracted" | "failed";
  failure_reason: string | null;
  imported_at: string;
  extracted_at: string | null;
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

function LibraryContent() {
  const searchParams = useSearchParams();
  const importingId = searchParams.get("importing_id");

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        setError("Gagal memuat daftar dokumen.");
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Books size={24} weight="duotone" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Pustaka Literatur Riset
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kelola dokumen ilmiah rujukan (PDF & DOCX) untuk sitasi manuskrip Anda.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDocuments}
              disabled={isLoading}
              className="h-9 px-3 gap-1.5 text-xs"
            >
              <ArrowClockwise size={15} className={isLoading ? "animate-spin text-blue-400" : ""} />
              <span>Segarkan</span>
            </Button>
            <Link href="/library/drive-browser">
              <Button size="sm" variant="default" className="h-9 px-4 gap-1.5 text-xs shadow-lg shadow-blue-600/20">
                <Plus size={16} weight="bold" />
                <span>Tambah Dokumen</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Import Progress Banner (if importing_id present) */}
        {importingId && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <ImportProgress
              documentId={importingId}
              onCompleted={() => fetchDocuments()}
              onRetrySuccess={() => fetchDocuments()}
            />
          </div>
        )}

        {/* Document List Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Daftar Dokumen Terimpor ({documents.length})
            </h2>
          </div>

          {isLoading && documents.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <CircleNotch size={32} className="animate-spin text-blue-500" />
              <p className="text-sm">Memuat pustaka dokumen...</p>
            </div>
          ) : error ? (
            <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
              <WarningOctagon size={36} className="text-red-400" />
              <p className="text-sm text-slate-300">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchDocuments} className="text-xs">
                Coba Lagi
              </Button>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
                <Books size={32} weight="thin" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-base font-semibold text-slate-200">Belum Ada Dokumen</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Impor dokumen artikel jurnal atau manuskrip (PDF / DOCX) dari Google Drive Anda untuk mulai menyusun draf paper.
                </p>
              </div>
              <Link href="/library/drive-browser">
                <Button size="sm" variant="default" className="text-xs gap-1.5">
                  <Plus size={16} weight="bold" />
                  <span>Impor dari Google Drive</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/40">
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4">Nama Dokumen</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Ukuran</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tanggal Impor</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 w-10">
                        <DriveFileIcon fileType={doc.file_type} />
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-200">
                        <span>{doc.file_name}</span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <Badge
                          variant="default"
                          className={
                            doc.file_type === "pdf"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/30 font-mono text-[10px]"
                              : "bg-sky-500/20 text-sky-300 border-sky-500/30 font-mono text-[10px]"
                          }
                        >
                          {doc.file_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {formatBytes(doc.file_size_bytes)}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {doc.import_status === "extracted" && (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle size={12} weight="fill" />
                            <span>Terekstrak</span>
                          </Badge>
                        )}
                        {doc.import_status === "failed" && (
                          <Badge variant="destructive" className="gap-1" title={doc.failure_reason || "Gagal"}>
                            <WarningOctagon size={12} weight="fill" />
                            <span>Gagal</span>
                          </Badge>
                        )}
                        {doc.import_status === "extracting" && (
                          <Badge variant="info" className="gap-1">
                            <CircleNotch size={12} className="animate-spin" />
                            <span>Mengekstrak</span>
                          </Badge>
                        )}
                        {doc.import_status === "importing" && (
                          <Badge variant="secondary" className="gap-1 text-slate-300">
                            <CircleNotch size={12} className="animate-spin" />
                            <span>Mengunduh</span>
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {formatDate(doc.imported_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <CircleNotch size={32} className="animate-spin text-blue-500" />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
