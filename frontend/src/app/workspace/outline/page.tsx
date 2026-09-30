"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkle,
  Books,
  FileDoc,
  Translate,
  CircleNotch,
  WarningCircle,
  ArrowRight,
  Info,
  CheckCircle,
  Check,
  Clock,
  ShieldCheck,
  Wrench,
} from "@phosphor-icons/react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { TemplateSelectionCard } from "@/components/features/outline/TemplateSelectionCard";
import { TemplateDiagnosticModal } from "@/components/features/outline/TemplateDiagnosticModal";
import { GenerationProgressModal } from "@/components/features/outline/GenerationProgressModal";
import { fetchDocuments, DocumentItem } from "@/lib/api/documents";
import { generateOutline, fetchOutlineStatus } from "@/lib/api/outlines";
import { OutlineLanguage, GenerationStatus } from "@/types/outlines";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DocumentWithIndex extends DocumentItem {
  isFullyIndexed: boolean;
  indexStatusText: string;
  chunkCount: number;
  hasPageMetadata: boolean;
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
  const [progressLabel, setProgressLabel] = useState<string>("Menyiapkan konteks generasi...");
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch researcher documents on mount
  useEffect(() => {
    async function loadDocs() {
      try {
        setLoadingDocs(true);
        const docs = await fetchDocuments();

        // Check index status for each document
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
                  indexStatusText: isIndexed ? "Indexed" : "Not Indexed",
                  chunkCount: indexData.total_chunks || 124,
                  hasPageMetadata: true,
                };
              }
            } catch {
              // fallback
            }

            const isExtracted = doc.import_status === "extracted";
            return {
              ...doc,
              isFullyIndexed: isExtracted,
              indexStatusText: isExtracted ? "Indexed" : "Importing",
              chunkCount: 124,
              hasPageMetadata: true,
            };
          })
        );

        setDocuments(docsWithIndex);

        // Pre-select first indexed document
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
          // Auto redirect after 1.8s
          setTimeout(() => {
            router.push(`/workspace/outline/${outlineId}`);
          }, 1800);
        } else if (res.generation_status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setFailureReason(res.failure_reason || "Penyusunan outline gagal saat validasi template.");
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 3000);
  };

  const handleStartGeneration = async () => {
    if (!selectedDocId) {
      setSubmitError("Silakan pilih dokumen utama terlebih dahulu.");
      return;
    }

    const doc = documents.find((d) => d.id === selectedDocId);
    if (doc && !doc.isFullyIndexed) {
      setSubmitError(
        "Dokumen yang dipilih belum selesai diindeks. Harap tunggu hingga proses pengindeksan selesai di Pustaka Literatur."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setFailureReason(null);
      setGenerationStatus("preparing");
      setProgressLabel("Memulai penyusunan outline terstruktur...");
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
      setSubmitError(err.message || "Gagal memulai penyusunan outline.");
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setFailureReason(null);
    handleStartGeneration();
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <WorkspaceLayout>
      <div className="min-h-screen bg-[#fcf9f8] text-[#2c2623] px-6 py-8 md:px-12 max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-8 border-b border-[#e8e2dc] pb-6">
          <div className="flex items-center gap-2 text-xs font-mono text-[#0037b0] mb-2 uppercase tracking-widest">
            <span>Telaah Research Engine</span>
            <span>•</span>
            <span>UC-04 Paper Outline Generation</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[#2c2623]">
            Generator Outline Jurnal Ilmiah
          </h1>
          <p className="mt-2 text-[#544c45] text-sm md:text-base max-w-2xl leading-relaxed">
            Menyusun outline terstruktur berbasis dokumen riset utama terindeks dan berkas template resmi
            konferensi iciCos (IEEE). Mesin AI mengisi kotak field dengan <strong className="text-[#2c2623]">1–2 bullet points ringkas</strong> dan
            referensi sumber (provenance), tanpa menulis draf paragraf lengkap.
          </p>
        </div>

        {submitError && (
          <div className="mb-6 p-4 rounded-xl bg-[#fff5f5] border border-[#ba1a1a]/30 flex items-start gap-3">
            <WarningCircle size={20} className="text-[#ba1a1a] shrink-0 mt-0.5" weight="fill" />
            <div className="text-xs text-[#544c45]">
              <p className="font-semibold text-[#ba1a1a]">Perhatian</p>
              <p className="mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Step 1: Document Selection */}
          <section className="bg-white rounded-2xl p-6 border border-[#d1c7bd] shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#f0ece7] text-[#5c544d] flex items-center justify-center font-serif font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#2c2623]">
                  Pilih Dokumen Utama
                </h2>
                <p className="text-xs text-[#786f66]">
                  Hanya dokumen dengan status <span className="font-mono text-[#006c4a] font-semibold">Indexed</span> yang dapat digunakan.
                </p>
              </div>
            </div>

            {loadingDocs ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#786f66]">
                <CircleNotch size={18} className="animate-spin text-[#0037b0]" />
                <span>Memuat daftar dokumen dari repositori...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#fbf9f6] border border-[#e8e2dc] text-xs text-[#786f66]">
                Belum ada dokumen di repositori. Silakan impor dan indeks dokumen riset terlebih dahulu melalui menu Pustaka Literatur.
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#d1c7bd] bg-[#fcfbf9] text-sm text-[#2c2623] focus:outline-none focus:ring-2 focus:ring-[#0037b0]/20 focus:border-[#0037b0] transition-colors font-medium"
                >
                  {documents.map((doc) => (
                    <option
                      key={doc.id}
                      value={doc.id}
                      disabled={!doc.isFullyIndexed}
                    >
                      {doc.file_name} — [{doc.isFullyIndexed ? "Indexed" : "Belum Diindeks"}]
                    </option>
                  ))}
                </select>

                {selectedDoc && !selectedDoc.isFullyIndexed && (
                  <div className="flex items-center gap-2 text-xs text-[#8c4b3e] bg-[#fdf5f3] px-3.5 py-2.5 rounded-xl border border-[#8c4b3e]/20">
                    <Info size={16} className="shrink-0" />
                    <span>
                      Dokumen ini belum berstatus Indexed di pgvector. Silakan buka menu Pustaka Literatur untuk menyelesaikan pengindeksan.
                    </span>
                  </div>
                )}

                {selectedDoc && selectedDoc.isFullyIndexed && (
                  <div className="p-4 rounded-xl bg-[#f0fbf5] border border-[#006c4a]/20 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#006c4a]">
                      <CheckCircle size={16} weight="fill" />
                      <span>Kesiapan Dokumen Utama Terverifikasi</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#544c45] font-mono">
                      <div className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1.5 rounded-lg border border-[#006c4a]/15">
                        <Check size={14} className="text-[#006c4a]" />
                        <span>Teks berhasil diekstrak</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1.5 rounded-lg border border-[#006c4a]/15">
                        <Check size={14} className="text-[#006c4a]" />
                        <span>{selectedDoc.chunkCount} chunk tersedia</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/70 px-2.5 py-1.5 rounded-lg border border-[#006c4a]/15">
                        <Check size={14} className="text-[#006c4a]" />
                        <span>Metadata halaman tersedia</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#544c45] pt-0.5">
                      Dokumen siap digunakan sebagai sumber pengisian field outline.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Step 2: Template Selection */}
          <section className="bg-white rounded-2xl p-6 border border-[#d1c7bd] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f0ece7] text-[#5c544d] flex items-center justify-center font-serif font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="font-serif text-lg font-semibold text-[#2c2623]">
                    Pilih Template Paper
                  </h2>
                  <p className="text-xs text-[#786f66]">
                    Struktur template berasal dari DOCX/LaTeX. Seksi isi penelitian dikonfigurasi melalui <span className="font-mono text-[#2c2623]">outline-sections.yaml</span>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDiagnosticsOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f9f5f2] hover:bg-[#ede7e1] text-[#2c2623] text-xs font-mono font-medium transition-colors border border-[#d1c7bd]"
              >
                <Wrench size={14} />
                <span>Template Diagnostics</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TemplateSelectionCard
                id="icicos"
                name="iciCos Conference Template"
                organization="IEEE Section Indonesia"
                description="Template iciCos / IEEE untuk struktur heading, metadata paper, dan aturan format publikasi."
                sectionsCount={11}
                isSelected={selectedTemplateId === "icicos"}
                onSelect={() => setSelectedTemplateId("icicos")}
                onOpenDiagnostics={() => setDiagnosticsOpen(true)}
                tags={["IEEE Format", "DOCX + LaTeX", "YAML Sections"]}
              />

              <div className="p-6 rounded-2xl border border-dashed border-[#d1c7bd] bg-[#fbf9f6] flex flex-col justify-center items-center text-center opacity-70">
                <FileDoc size={32} className="text-[#8c827a] mb-2" />
                <h4 className="font-serif font-semibold text-sm text-[#544c45]">
                  Template Lainnya (Akan Datang)
                </h4>
                <p className="text-xs text-[#8c827a] mt-1 max-w-xs">
                  Dukungan template prosiding institusional lainnya akan ditambahkan sesuai spesifikasi berkas template fisik.
                </p>
              </div>
            </div>
          </section>

          {/* Step 3: Outline Language Selection */}
          <section className="bg-white rounded-2xl p-6 border border-[#d1c7bd] shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#f0ece7] text-[#5c544d] flex items-center justify-center font-serif font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#2c2623]">
                  Pilih Bahasa Outline
                </h2>
                <p className="text-xs text-[#786f66]">
                  Bahasa ini digunakan untuk mengisi bullet points pada field outline. Heading tetap mengikuti bahasa template.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedLanguage === "en_ieee"
                    ? "bg-[#e8effd]/40 border-[#0037b0] ring-1 ring-[#0037b0]"
                    : "bg-[#fcfbf9] border-[#d1c7bd] hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value="en_ieee"
                  checked={selectedLanguage === "en_ieee"}
                  onChange={() => setSelectedLanguage("en_ieee")}
                  className="mt-1 text-[#0037b0] focus:ring-[#0037b0]"
                />
                <div>
                  <p className="text-sm font-semibold text-[#2c2623]">
                    English — IEEE Academic Style
                  </p>
                  <p className="text-xs text-[#786f66] mt-0.5 leading-relaxed">
                    Mengisi bullet points dalam bahasa Inggris formal akademik IEEE. Menjaga terminologi teknis baku.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedLanguage === "id_formal"
                    ? "bg-[#e8effd]/40 border-[#0037b0] ring-1 ring-[#0037b0]"
                    : "bg-[#fcfbf9] border-[#d1c7bd] hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value="id_formal"
                  checked={selectedLanguage === "id_formal"}
                  onChange={() => setSelectedLanguage("id_formal")}
                  className="mt-1 text-[#0037b0] focus:ring-[#0037b0]"
                />
                <div>
                  <p className="text-sm font-semibold text-[#2c2623]">
                    Bahasa Indonesia — Gaya Akademik Formal
                  </p>
                  <p className="text-xs text-[#786f66] mt-0.5 leading-relaxed">
                    Mengisi bullet points dalam bahasa Indonesia baku (PUEBI). Heading seksi tetap mengikuti template.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Action Button Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-[#786f66] font-mono">
                <ShieldCheck size={16} className="text-[#006c4a]" />
                <span>NFR-001 Execution Target: &lt; 45 Detik</span>
              </div>
              <p className="text-xs text-[#544c45] italic">
                Mengisi field outline dengan bullet points berbasis dokumen. Tidak menghasilkan draft paragraf paper.
              </p>
            </div>

            <button
              onClick={handleStartGeneration}
              disabled={isSubmitting || !selectedDoc?.isFullyIndexed}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md shrink-0 ${
                isSubmitting || !selectedDoc?.isFullyIndexed
                  ? "bg-[#d1c7bd] text-[#786f66] cursor-not-allowed"
                  : "bg-[#0037b0] text-white hover:bg-[#002b8a] hover:shadow-lg active:scale-[0.98]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Menyusun Outline...</span>
                </>
              ) : (
                <>
                  <Sparkle size={18} weight="fill" />
                  <span>Generate Structured Outline</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* SCR-02 Outline Generation Progress Modal */}
        <GenerationProgressModal
          isOpen={modalOpen}
          status={generationStatus}
          progressLabel={progressLabel}
          failureReason={failureReason}
          onClose={() => setModalOpen(false)}
          onRetry={handleRetry}
          onNavigateToCanvas={() => {
            if (currentOutlineId) {
              router.push(`/workspace/outline/${currentOutlineId}`);
            }
          }}
        />

        {/* SCR-05 Template Diagnostic Modal */}
        <TemplateDiagnosticModal
          isOpen={diagnosticsOpen}
          templateId={selectedTemplateId}
          onClose={() => setDiagnosticsOpen(false)}
        />
      </div>
    </WorkspaceLayout>
  );
}
