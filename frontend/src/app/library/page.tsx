"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImportProgress } from "@/components/features/drive/ImportProgress";
import { DriveFileIcon } from "@/components/features/drive/DriveFileIcon";
import {
  Plus,
  Books,
  CircleNotch,
  WarningOctagon,
  CheckCircle,
  ArrowClockwise,
  MagnifyingGlass,
  Funnel,
  ShieldCheck,
  Database,
  Cpu,
  Info,
} from "@phosphor-icons/react";
import { DocumentIndexingCell } from "@/components/features/indexing/DocumentIndexingCell";
import { IndexingDetailModal } from "@/components/features/indexing/IndexingDetailModal";
import { SimilaritySearchTest } from "@/components/features/indexing/SimilaritySearchTest";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<{ id: string; name: string } | null>(null);

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

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchQuery === "" ||
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || doc.import_status === statusFilter;
      const matchesType =
        typeFilter === "all" || doc.file_type.toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [documents, searchQuery, statusFilter, typeFilter]);

  return (
    <WorkspaceLayout>
      <div className="flex-1 w-full px-5 md:px-6 py-5 md:py-6 flex flex-col gap-6 bg-[#fcf9f8]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb]">
          <div className="text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center">
                <Books size={20} weight="regular" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-medium tracking-tight text-[#1c1b1b]">
                  Pustaka Literatur Riset
                </h1>
                <p className="text-xs text-[#434655] mt-0.5">
                  Kelola dokumen ilmiah rujukan (PDF & DOCX) untuk sitasi manuskrip Anda.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDocuments}
              disabled={isLoading}
              className="h-8 px-3 gap-1.5 text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] cursor-pointer rounded shadow-2xs"
            >
              <ArrowClockwise size={14} className={isLoading ? "animate-spin text-[#1d4ed8]" : ""} />
              <span>Segarkan</span>
            </Button>
            <Link href="/library/drive-browser">
              <Button size="sm" variant="default" className="h-8 px-3.5 gap-1.5 text-xs shadow-2xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white cursor-pointer rounded">
                <Plus size={14} weight="bold" />
                <span>Tambah Dokumen</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Read-Only Drive Security Banner */}
        <div className="p-3 bg-white border border-[#e5e7eb] rounded flex items-center gap-2.5 text-xs text-[#434655] shadow-2xs text-left">
          <Info size={16} className="text-[#1d4ed8] shrink-0" weight="bold" />
          <span>
            <strong className="text-[#1c1b1b]">Akses Read-Only:</strong> Berkas di Google Drive Anda aman. Telaah hanya membaca isi dokumen untuk analisis teks tanpa pernah mengubah atau menghapus berkas asli Anda.
          </span>
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

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded border border-[#e5e7eb] shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747686]" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama berkas, judul, kata kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 bg-[#f7f6f3] border border-[#e5e7eb] rounded text-xs text-[#1c1b1b] placeholder:text-[#747686] focus:outline-none focus:border-[#1d4ed8] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-[#747686] font-mono">
              <Funnel size={12} />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#f7f6f3] border border-[#e5e7eb] rounded text-xs text-[#1c1b1b] px-2.5 py-1.5 focus:outline-none focus:border-[#1d4ed8] font-mono"
            >
              <option value="all">Semua Status</option>
              <option value="extracted">Terekstrak</option>
              <option value="extracting">Mengekstrak</option>
              <option value="importing">Mengunduh</option>
              <option value="failed">Gagal</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#f7f6f3] border border-[#e5e7eb] rounded text-xs text-[#1c1b1b] px-2.5 py-1.5 focus:outline-none focus:border-[#1d4ed8] font-mono"
            >
              <option value="all">Semua Format</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </div>
        </div>

        {/* Document List Table */}
        <div className="bg-white border border-[#e5e7eb] rounded overflow-hidden shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_-1px_rgba(15,23,42,0.02)]">
          <div className="p-3.5 border-b border-[#e5e7eb] bg-[#f7f6f3] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#1c1b1b] font-mono uppercase tracking-wider">
              Daftar Dokumen Terimpor ({filteredDocuments.length}{filteredDocuments.length !== documents.length ? ` dari ${documents.length}` : ""})
            </h2>
            <span className="text-[11px] font-sans text-[#006c4a] flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]" />
              <span>Pengindeksan Siap</span>
            </span>
          </div>

          {isLoading && documents.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-[#747686] gap-3">
              <CircleNotch size={28} className="animate-spin text-[#1d4ed8]" />
              <p className="text-xs">Memuat pustaka dokumen...</p>
            </div>
          ) : error ? (
            <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
              <WarningOctagon size={32} className="text-[#ba1a1a]" />
              <p className="text-xs text-[#1c1b1b]">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchDocuments} className="text-xs cursor-pointer rounded">
                Coba Lagi
              </Button>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-14 h-14 rounded bg-[#f7f6f3] border border-[#e5e7eb] flex items-center justify-center text-[#747686]">
                <Books size={28} weight="thin" />
              </div>
              <div className="max-w-sm">
                <h3 className="font-serif text-base font-medium text-[#1c1b1b]">Belum Ada Dokumen</h3>
                <p className="text-xs text-[#434655] mt-1">
                  Impor dokumen artikel jurnal atau manuskrip (PDF / DOCX) dari Google Drive Anda untuk mulai menyusun draf paper.
                </p>
              </div>
              <Link href="/library/drive-browser">
                <Button size="sm" variant="default" className="text-xs gap-1.5 cursor-pointer rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white">
                  <Plus size={15} weight="bold" />
                  <span>Impor dari Google Drive</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-[10.5px] font-mono font-semibold text-[#747686] uppercase tracking-wider bg-[#f7f6f3]">
                    <th className="py-2.5 px-3.5 w-10"></th>
                    <th className="py-2.5 px-3.5">Nama Dokumen</th>
                    <th className="py-2.5 px-3.5">Tipe</th>
                    <th className="py-2.5 px-3.5">Ukuran</th>
                    <th className="py-2.5 px-3.5">Status Ekstraksi</th>
                    <th className="py-2.5 px-3.5">Status Pengindeksan</th>
                    <th className="py-2.5 px-3.5">Tanggal Impor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-[#f0eded] hover:bg-[#f7f6f3] transition-colors"
                    >
                      <td className="py-2.5 px-3.5 w-10">
                        <DriveFileIcon fileType={doc.file_type} />
                      </td>
                      <td className="py-2.5 px-3.5 text-xs font-medium text-[#1c1b1b]">
                        <button
                          type="button"
                          onClick={() => setSelectedDocForDetail({ id: doc.id, name: doc.file_name })}
                          className="hover:text-[#1d4ed8] text-left transition-colors cursor-pointer font-sans"
                          title="Klik untuk melihat detail metadata dan index"
                        >
                          {doc.file_name}
                        </button>
                      </td>
                      <td className="py-2.5 px-3.5 text-xs">
                        <Badge
                          variant="secondary"
                          className={
                            doc.file_type === "pdf"
                              ? "bg-[#ffdad6]/50 text-[#ba1a1a] border border-[#ffdad6] font-mono text-[10px]"
                              : "bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] font-mono text-[10px]"
                          }
                        >
                          {doc.file_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3.5 text-[11px] font-mono text-[#747686]">
                        {formatBytes(doc.file_size_bytes)}
                      </td>
                      <td className="py-2.5 px-3.5 text-xs">
                        {doc.import_status === "extracted" && (
                          <Badge variant="success" className="gap-1 bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]">
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
                          <Badge variant="info" className="gap-1 bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]">
                            <CircleNotch size={12} className="animate-spin" />
                            <span>Mengekstrak</span>
                          </Badge>
                        )}
                        {doc.import_status === "importing" && (
                          <Badge variant="secondary" className="gap-1 text-[#434655]">
                            <CircleNotch size={12} className="animate-spin" />
                            <span>Mengunduh</span>
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-xs">
                        <DocumentIndexingCell
                          documentId={doc.id}
                          importStatus={doc.import_status}
                          onOpenDetail={(id) => setSelectedDocForDetail({ id, name: doc.file_name })}
                        />
                      </td>
                      <td className="py-2.5 px-3.5 text-[11px] font-mono text-[#747686]">
                        {formatDate(doc.imported_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Semantic Similarity Search Verification Panel */}
        <div id="similarity">
          <SimilaritySearchTest />
        </div>

        {/* Indexing Detail Modal */}
        <IndexingDetailModal
          isOpen={!!selectedDocForDetail}
          onClose={() => setSelectedDocForDetail(null)}
          documentId={selectedDocForDetail?.id ?? null}
          fileName={selectedDocForDetail?.name}
          onReindexTriggered={fetchDocuments}
        />
      </div>
    </WorkspaceLayout>
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center text-[#747686]">
          <CircleNotch size={32} className="animate-spin text-[#1d4ed8]" />
        </div>
      }
    >
      <LibraryContent />
    </Suspense>
  );
}
