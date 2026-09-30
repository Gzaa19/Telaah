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
  Clock,
  ShieldCheck,
} from "@phosphor-icons/react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { TemplateSelectionCard } from "@/components/features/outline/TemplateSelectionCard";
import { GenerationProgressModal } from "@/components/features/outline/GenerationProgressModal";
import { fetchDocuments, DocumentItem } from "@/lib/api/documents";
import { generateOutline, fetchOutlineStatus } from "@/lib/api/outlines";
import { OutlineLanguage, GenerationStatus } from "@/types/outlines";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DocumentWithIndex extends DocumentItem {
  isFullyIndexed: boolean;
  indexStatusText: string;
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
                  indexStatusText: isIndexed ? "Siap / Terindeks" : "Belum diindeks",
                };
              }
            } catch {
              // fallback
            }

            const isExtracted = doc.import_status === "extracted";
            return {
              ...doc,
              isFullyIndexed: isExtracted,
              indexStatusText: isExtracted ? "Siap / Terekstraksi" : "Sedang diproses",
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
          setFailureReason(res.failure_reason || "Generasi outline gagal saat validasi template.");
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 3000);
  };

  const handleStartGeneration = async () => {
    if (!selectedDocId) {
      setSubmitError("Silakan pilih dokumen literatur terlebih dahulu.");
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
      setProgressLabel("Memulai pipeline generasi outline...");
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
            Pilih dokumen rujukan dari Pustaka Literatur Anda dan konfigurasikan template prosiding 
            resmi iciCos (IEEE). Mesin AI akan menyusun kerangka IMRaD terstruktur lengkap dengan 
            provenance chunk dan penanda verifikasi <span className="font-mono text-xs bg-[#f3efe9] px-1 py-0.5 rounded">[NEEDS INPUT]</span>.
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
                  Pilih Dokumen Literatur
                </h2>
                <p className="text-xs text-[#786f66]">
                  Hanya dokumen yang telah diekstraksi dan terindeks dalam pgvector yang dapat digunakan.
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
                  className="w-full px-4 py-3 rounded-xl border border-[#d1c7bd] bg-[#fcfbf9] text-sm text-[#2c2623] focus:outline-none focus:ring-2 focus:ring-[#0037b0]/20 focus:border-[#0037b0] transition-colors"
                >
                  {documents.map((doc) => (
                    <option
                      key={doc.id}
                      value={doc.id}
                      disabled={!doc.isFullyIndexed}
                    >
                      {doc.file_name} {!doc.isFullyIndexed ? "(Belum Diindeks - Tidak Tersedia)" : "(Siap Terindeks)"}
                    </option>
                  ))}
                </select>

                {selectedDoc && !selectedDoc.isFullyIndexed && (
                  <div className="flex items-center gap-2 text-xs text-[#8c4b3e] bg-[#fdf5f3] px-3.5 py-2 rounded-lg border border-[#8c4b3e]/20">
                    <Info size={16} />
                    <span>
                      Dokumen ini belum diindeks ke pgvector. Silakan buka menu Pustaka Literatur untuk memulai pengindeksan.
                    </span>
                  </div>
                )}

                {selectedDoc && selectedDoc.isFullyIndexed && (
                  <div className="flex items-center gap-2 text-xs text-[#006c4a] bg-[#f0fbf5] px-3.5 py-2 rounded-lg border border-[#006c4a]/20">
                    <CheckCircle size={16} weight="fill" />
                    <span>
                      Dokumen terverifikasi aktif. Chunks siap diretrieve untuk ekstraksi konteks IMRaD.
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Step 2: Template Selection */}
          <section className="bg-white rounded-2xl p-6 border border-[#d1c7bd] shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#f0ece7] text-[#5c544d] flex items-center justify-center font-serif font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#2c2623]">
                  Pilih Template Prosiding Konferensi
                </h2>
                <p className="text-xs text-[#786f66]">
                  Format outline akan strictly mengikuti struktur heading, metadata, dan batasan template ini.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TemplateSelectionCard
                id="icicos"
                name="iciCos Conference Template"
                organization="IEEE Section Indonesia"
                description="Template resmi International Conference on Informatics and Computational Sciences. Memformat struktur IMRaD (Introduction, Methodology, Results and Discussion, Conclusion) dalam gaya IEEE A4 Two-Column."
                sectionsCount={6}
                isSelected={selectedTemplateId === "icicos"}
                onSelect={() => setSelectedTemplateId("icicos")}
                tags={["IEEE Standard", "IMRaD", "A4 2-Column", "LaTeX/DOCX"]}
              />

              <div className="p-6 rounded-xl border border-dashed border-[#d1c7bd] bg-[#fbf9f6] flex flex-col justify-center items-center text-center opacity-70">
                <FileDoc size={32} className="text-[#8c827a] mb-2" />
                <h4 className="font-serif font-semibold text-sm text-[#544c45]">
                  Template Lainnya (Akan Datang)
                </h4>
                <p className="text-xs text-[#8c827a] mt-1 max-w-xs">
                  Dukungan template berkas institusional lainnya akan ditambahkan sesuai spesifikasi berkas template.
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
                  Pilih Bahasa Sintesis Outline
                </h2>
                <p className="text-xs text-[#786f66]">
                  Bahasa yang akan digunakan dalam sintesis konten dan panduan field.
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
                    English (IEEE Formal Academic Style)
                  </p>
                  <p className="text-xs text-[#786f66] mt-0.5 leading-relaxed">
                    Direkomendasikan untuk iciCos. Menjaga terminologi teknis baku dan struktur kalimat pasif formal.
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
                    Bahasa Indonesia (Gaya Akademik Formal)
                  </p>
                  <p className="text-xs text-[#786f66] mt-0.5 leading-relaxed">
                    Sesuai PUEBI dan kaidah penulisan ilmiah bahasa Indonesia, mempertahankan istilah komputasi standar.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Action Button Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-[#786f66] font-mono">
              <ShieldCheck size={16} className="text-[#006c4a]" />
              <span>NFR-001 Execution Target: &lt; 45 Detik</span>
            </div>

            <button
              onClick={handleStartGeneration}
              disabled={isSubmitting || !selectedDoc?.isFullyIndexed}
              className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                isSubmitting || !selectedDoc?.isFullyIndexed
                  ? "bg-[#d1c7bd] text-[#786f66] cursor-not-allowed"
                  : "bg-[#0037b0] text-white hover:bg-[#002b8a] hover:shadow-lg active:scale-[0.98]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={18} className="animate-spin" />
                  <span>Menginisiasi Outline...</span>
                </>
              ) : (
                <>
                  <Sparkle size={18} weight="fill" />
                  <span>Generate Paper Outline</span>
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
      </div>
    </WorkspaceLayout>
  );
}
