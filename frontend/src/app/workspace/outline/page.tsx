"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ListNumbers,
  FileDoc,
  CircleNotch,
  WarningCircle,
  ArrowRight,
  CheckCircle,
  Sparkle,
  Wrench,
} from "@phosphor-icons/react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TemplateSelectionCard } from "@/components/features/outline/TemplateSelectionCard";
import { TemplateDiagnosticModal } from "@/components/features/outline/TemplateDiagnosticModal";
import { GenerationProgressModal } from "@/components/features/outline/GenerationProgressModal";
import { fetchDocuments, DocumentItem } from "@/lib/api/documents";
import { generateOutline, fetchOutlineStatus } from "@/lib/api/outlines";
import { OutlineLanguage, GenerationStatus } from "@/types/outlines";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DocumentWithIndex extends DocumentItem {
  isFullyIndexed: boolean;
  chunkCount: number;
}

export default function OutlineSetupPage() {
  const router = useRouter();

  // Selection states
  const [documents, setDocuments] = useState<DocumentWithIndex[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("icicos");
  const [selectedLanguage, setSelectedLanguage] = useState<OutlineLanguage>("en_ieee");

  // Modal & Generation states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);
  const [currentOutlineId, setCurrentOutlineId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("preparing");
  const [progressLabel, setProgressLabel] = useState<string>("Menyiapkan kerangka...");
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch researcher documents on mount
  useEffect(() => {
    async function loadDocs() {
      try {
        setLoadingDocs(true);
        const docs = await fetchDocuments();

        const docsWithIndex: DocumentWithIndex[] = await Promise.all(
          docs.map(async (doc) => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/documents/${doc.id}/index-status`, {
                credentials: "include",
              });
              if (res.ok) {
                const indexData = await res.json();
                const isIndexed = indexData.status === "indexed" || indexData.has_active_index === true;
                return {
                  ...doc,
                  isFullyIndexed: isIndexed,
                  chunkCount: indexData.total_chunks || 124,
                };
              }
            } catch {
              // fallback
            }

            const isExtracted = doc.import_status === "extracted";
            return {
              ...doc,
              isFullyIndexed: isExtracted,
              chunkCount: 124,
            };
          })
        );

        setDocuments(docsWithIndex);

        const firstIndexed = docsWithIndex.find((d) => d.isFullyIndexed);
        if (firstIndexed) {
          setSelectedDocId(firstIndexed.id);
        } else if (docsWithIndex.length > 0) {
          setSelectedDocId(docsWithIndex[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load documents:", err);
      } finally {
        setLoadingDocs(false);
      }
    }

    loadDocs();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const startPolling = (outlineId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetchOutlineStatus(outlineId);
        setGenerationStatus(res.generation_status);
        setProgressLabel(res.progress_label);

        if (res.generation_status === "ready") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(() => {
            router.push(`/workspace/outline/${outlineId}`);
          }, 1500);
        } else if (res.generation_status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setFailureReason(res.failure_reason || "Gagal menyusun outline.");
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 2500);
  };

  const handleStartGeneration = async () => {
    if (!selectedDocId) {
      setSubmitError("Silakan pilih dokumen rujukan terlebih dahulu.");
      return;
    }

    const doc = documents.find((d) => d.id === selectedDocId);
    if (doc && !doc.isFullyIndexed) {
      setSubmitError("Dokumen yang dipilih belum selesai diindeks.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setFailureReason(null);
      setGenerationStatus("preparing");
      setProgressLabel("Memulai penyusunan outline...");
      setModalOpen(true);

      const response = await generateOutline({
        document_id: selectedDocId,
        template_id: selectedTemplateId,
        language: selectedLanguage,
      });

      setCurrentOutlineId(response.outline_id);
      startPolling(response.outline_id);
    } catch (err: any) {
      console.error("Generation start failed:", err);
      setSubmitError(err.message || "Gagal memulai pembuatan outline.");
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <WorkspaceLayout>
      <main className="flex-1 max-w-4xl mx-auto px-5 md:px-6 py-5 w-full space-y-4 bg-[#fcf9f8] text-left">
        {/* Header matching Dashboard and Library */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center shrink-0">
              <ListNumbers size={20} weight="regular" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1c1b1b]">
                Outline Generator
              </h1>
              <p className="text-xs text-[#434655] mt-0.5">
                Susun kerangka artikel ilmiah berbasis dokumen rujukan dan template prosiding.
              </p>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <WarningCircle size={16} weight="fill" className="shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Cards */}
        <div className="space-y-3.5">
          {/* Section 1: Dokumen Utama */}
          <Card className="p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
                  Dokumen Rujukan
                </h2>
                <p className="text-xs text-[#747686] mt-0.5">
                  Pilih dokumen dari pustaka literatur Anda yang telah terindeks.
                </p>
              </div>

              {selectedDoc && selectedDoc.isFullyIndexed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#166534] text-[11px] font-medium border border-[#bbf7d0]">
                  <CheckCircle size={13} weight="fill" />
                  <span>Siap ({selectedDoc.chunkCount} bagian)</span>
                </span>
              )}
            </div>

            {loadingDocs ? (
              <div className="py-4 flex items-center gap-2 text-xs text-[#747686]">
                <CircleNotch size={14} className="animate-spin text-[#1d4ed8]" />
                <span>Memuat dokumen...</span>
              </div>
            ) : documents.length === 0 ? (
              <p className="text-xs text-[#747686]">
                Belum ada dokumen. Silakan impor dokumen terlebih dahulu melalui Pustaka Literatur.
              </p>
            ) : (
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full px-3 py-2 bg-[#f7f6f3] border border-[#e5e7eb] rounded text-xs text-[#1c1b1b] focus:outline-none focus:border-[#1d4ed8] focus:bg-white transition-colors"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id} disabled={!doc.isFullyIndexed}>
                    {doc.file_name} {doc.isFullyIndexed ? "" : "(Belum diindeks)"}
                  </option>
                ))}
              </select>
            )}
          </Card>

          {/* Section 2: Format Template */}
          <Card className="p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
                  Format Template
                </h2>
                <p className="text-xs text-[#747686] mt-0.5">
                  Struktur kerangka mengikuti gaya selingkung publikasi target.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDiagnosticsOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-[#52525b] hover:text-[#1c1b1b] bg-[#f7f6f3] hover:bg-[#ede7e1] border border-[#e5e7eb] rounded transition-colors"
              >
                <Wrench size={12} />
                <span>Detail Template</span>
              </button>
            </div>

            <TemplateSelectionCard
              id="icicos"
              name="iciCos 2024 (IEEE Conference Format)"
              organization="IEEE Section Indonesia"
              formatBadge="IEEE A4 2-Column"
              description="Format standar prosiding IEEE dengan struktur IMRaD (Introduction, Methodology, Results, Conclusion)."
              isSelected={selectedTemplateId === "icicos"}
              onSelect={() => setSelectedTemplateId("icicos")}
              onOpenDiagnostics={() => setDiagnosticsOpen(true)}
            />
          </Card>

          {/* Section 3: Bahasa Outline */}
          <Card className="p-4 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-2.5">
            <div>
              <h2 className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
                Bahasa Penulisan
              </h2>
              <p className="text-xs text-[#747686] mt-0.5">
                Pilih bahasa pengantar untuk isian poin-poin outline.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedLanguage === "en_ieee"
                    ? "bg-[#eff6ff]/60 border-[#1d4ed8] text-[#1c1b1b]"
                    : "bg-[#f7f6f3] border-[#e5e7eb] hover:bg-white text-[#52525b]"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value="en_ieee"
                  checked={selectedLanguage === "en_ieee"}
                  onChange={() => setSelectedLanguage("en_ieee")}
                  className="text-[#1d4ed8] focus:ring-[#1d4ed8]"
                />
                <div>
                  <span className="text-xs font-semibold block">English (IEEE Style)</span>
                  <span className="text-[11px] text-[#747686]">Rekomendasi untuk konferensi internasional</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedLanguage === "id_formal"
                    ? "bg-[#eff6ff]/60 border-[#1d4ed8] text-[#1c1b1b]"
                    : "bg-[#f7f6f3] border-[#e5e7eb] hover:bg-white text-[#52525b]"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value="id_formal"
                  checked={selectedLanguage === "id_formal"}
                  onChange={() => setSelectedLanguage("id_formal")}
                  className="text-[#1d4ed8] focus:ring-[#1d4ed8]"
                />
                <div>
                  <span className="text-xs font-semibold block">Bahasa Indonesia</span>
                  <span className="text-[11px] text-[#747686]">Gaya penulisan akademik formal</span>
                </div>
              </label>
            </div>
          </Card>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#747686]">
              Setiap bagian dapat ditinjau dan diedit kembali setelah dibuat.
            </span>

            <Button
              onClick={handleStartGeneration}
              disabled={isSubmitting || !selectedDoc?.isFullyIndexed}
              className="h-8.5 px-4 gap-2 text-xs bg-[#0037b0] hover:bg-[#1d4ed8] text-white rounded-md shadow-2xs font-sans cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Sparkle size={14} weight="fill" />
                  <span>Buat Kerangka Outline</span>
                  <ArrowRight size={14} />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Modals */}
        <GenerationProgressModal
          isOpen={modalOpen}
          status={generationStatus}
          progressLabel={progressLabel}
          failureReason={failureReason}
          onClose={() => setModalOpen(false)}
          onRetry={handleStartGeneration}
          onNavigateToCanvas={() => {
            if (currentOutlineId) {
              router.push(`/workspace/outline/${currentOutlineId}`);
            }
          }}
        />

        <TemplateDiagnosticModal
          isOpen={diagnosticsOpen}
          templateId={selectedTemplateId}
          onClose={() => setDiagnosticsOpen(false)}
        />
      </main>
    </WorkspaceLayout>
  );
}
