"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ListNumbers,
  FileDoc,
  CircleNotch,
  WarningCircle,
  ArrowRight,
  CheckCircle,
  Sparkle,
  Wrench,
  ShieldCheck,
  Check,
  Bookmarks,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
      <main className="flex-1 w-full max-w-7xl mx-auto px-5 md:px-8 py-6 flex flex-col gap-6 bg-[#fcf9f8] text-left">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#eff6ff] text-[#0037b0] border border-[#bfdbfe] flex items-center justify-center shrink-0 shadow-2xs">
              <ListNumbers size={22} weight="regular" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1c1b1b]">
                  Outline Generator
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-sans font-medium border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">
                  iciCos / IEEE 2024
                </Badge>
              </div>
              <p className="text-xs text-[#434655] mt-1">
                Konfigurasi kerangka naskah ilmiah berbasis ekstraksi literatur dan gaya selingkung prosiding.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setDiagnosticsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#434655] hover:text-[#1c1b1b] bg-white hover:bg-[#f7f6f3] border border-[#e5e7eb] rounded transition-colors shadow-2xs cursor-pointer font-sans"
            >
              <Wrench size={13} />
              <span>Spesifikasi Template</span>
            </button>
          </div>
        </div>

        {submitError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2.5 font-sans">
            <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
            <span className="flex-1">{submitError}</span>
          </div>
        )}

        {/* 2-Column Responsive Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Configuration Parameters (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Step 1: Dokumen Literatur Rujukan */}
            <Card className="p-5 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#f0eded] text-[#434655] font-sans font-bold text-[10.5px] flex items-center justify-center">
                      1
                    </span>
                    <h2 className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
                      Dokumen Literatur Rujukan
                    </h2>
                  </div>
                  <p className="text-xs text-[#747686] mt-1 pl-7 font-sans">
                    Pilih artikel riset dari Pustaka Literatur Anda yang telah terindeks vektor.
                  </p>
                </div>

                {selectedDoc?.isFullyIndexed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] text-[11px] font-medium border border-[#a7f3d0] shrink-0 font-sans">
                    <CheckCircle size={13} weight="fill" className="text-[#006c4a]" />
                    <span>Terindeks ({selectedDoc.chunkCount} bagian)</span>
                  </span>
                )}
              </div>

              <div className="pl-0 sm:pl-7 space-y-3">
                {loadingDocs ? (
                  <div className="space-y-2 py-1">
                    <Skeleton className="h-9 w-full rounded border border-[#e5e7eb]" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3.5 w-44 rounded" />
                      <Skeleton className="h-3.5 w-24 rounded" />
                    </div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-4 bg-[#f7f6f3] border border-dashed border-[#e5e7eb] rounded text-center text-xs text-[#747686] space-y-2 font-sans">
                    <p>Belum ada dokumen yang terdaftar dalam pustaka.</p>
                    <Link href="/library/drive-browser">
                      <Button size="sm" variant="outline" className="text-xs">
                        Impor dari Google Drive
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <select
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#fcf9f8] hover:bg-white border border-[#e5e7eb] rounded text-xs text-[#1c1b1b] font-sans focus:outline-none focus:border-[#0037b0] focus:ring-1 focus:ring-[#0037b0] transition-colors cursor-pointer"
                    >
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id} disabled={!doc.isFullyIndexed}>
                          {doc.file_name} {doc.isFullyIndexed ? "" : "(Belum diindeks)"}
                        </option>
                      ))}
                    </select>

                    {selectedDoc && (
                      <div className="p-3 bg-[#f7f6f3] border border-[#e5e7eb] rounded flex items-center justify-between text-xs text-[#434655]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileDoc size={16} weight="duotone" className="text-[#0037b0] shrink-0" />
                          <span className="truncate font-sans font-medium text-[#1c1b1b]">
                            {selectedDoc.file_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-[11px] font-sans text-[#747686]">
                          <span>{selectedDoc.file_type.toUpperCase()}</span>
                          <span>·</span>
                          <span className="text-[#006c4a] font-medium flex items-center gap-1">
                            <Check size={11} weight="bold" /> Siap Sintesis
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Step 2: Format Template Publikasi */}
            <Card className="p-5 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#f0eded] text-[#434655] font-sans font-bold text-[10.5px] flex items-center justify-center">
                      2
                    </span>
                    <h2 className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
                      Format Template Publikasi
                    </h2>
                  </div>
                  <p className="text-xs text-[#747686] mt-1 pl-7 font-sans">
                    Gaya selingkung baku dan komponen heading prosiding target.
                  </p>
                </div>
              </div>

              <div className="pl-0 sm:pl-7">
                <TemplateSelectionCard
                  id="icicos"
                  name="iciCos 2024 (IEEE Conference Format)"
                  organization="IEEE Section Indonesia"
                  formatBadge="IEEE A4 2-Column"
                  description="Format standar prosiding IEEE dengan struktur IMRaD (Introduction, Related Work, Methodology, Results, Conclusion)."
                  isSelected={selectedTemplateId === "icicos"}
                  onSelect={() => setSelectedTemplateId("icicos")}
                  onOpenDiagnostics={() => setDiagnosticsOpen(true)}
                />
              </div>
            </Card>

            {/* Step 3: Bahasa & Gaya Penulisan */}
            <Card className="p-5 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#f0eded] text-[#434655] font-sans font-bold text-[10.5px] flex items-center justify-center">
                      3
                    </span>
                    <h2 className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
                      Bahasa & Gaya Penulisan
                    </h2>
                  </div>
                  <p className="text-xs text-[#747686] mt-1 pl-7 font-sans">
                    Pilih bahasa pengantar untuk isian poin-poin outline naskah.
                  </p>
                </div>
              </div>

              <div className="pl-0 sm:pl-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded border cursor-pointer transition-all ${
                    selectedLanguage === "en_ieee"
                      ? "bg-[#eff6ff]/60 border-[#0037b0] shadow-2xs text-[#1c1b1b]"
                      : "bg-white border-[#e5e7eb] hover:border-[#c4c5d7] text-[#434655]"
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value="en_ieee"
                    checked={selectedLanguage === "en_ieee"}
                    onChange={() => setSelectedLanguage("en_ieee")}
                    className="mt-0.5 text-[#0037b0] focus:ring-[#0037b0]"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold block text-[#1c1b1b] font-sans">
                      English (IEEE Style)
                    </span>
                    <span className="text-[11px] text-[#747686] block font-sans leading-relaxed">
                      Gaya akademik baku untuk prosiding konferensi internasional IEEE.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded border cursor-pointer transition-all ${
                    selectedLanguage === "id_formal"
                      ? "bg-[#eff6ff]/60 border-[#0037b0] shadow-2xs text-[#1c1b1b]"
                      : "bg-white border-[#e5e7eb] hover:border-[#c4c5d7] text-[#434655]"
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value="id_formal"
                    checked={selectedLanguage === "id_formal"}
                    onChange={() => setSelectedLanguage("id_formal")}
                    className="mt-0.5 text-[#0037b0] focus:ring-[#0037b0]"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold block text-[#1c1b1b] font-sans">
                      Bahasa Indonesia
                    </span>
                    <span className="text-[11px] text-[#747686] block font-sans leading-relaxed">
                      Gaya penulisan akademik formal untuk manuskrip atau jurnal ilmiah nasional.
                    </span>
                  </div>
                </label>
              </div>
            </Card>

            {/* Bottom Action Bar */}
            <div className="p-4 bg-white border border-[#e5e7eb] rounded-lg shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#434655] font-sans text-center sm:text-left">
                <p className="font-semibold text-[#1c1b1b]">Human-in-the-Loop Workflow</p>
                <p className="text-[11px] text-[#747686] mt-0.5">
                  Setiap butir draf outline dapat ditinjau, disunting, atau diregenerasi secara fleksibel.
                </p>
              </div>

              <Button
                onClick={handleStartGeneration}
                disabled={isSubmitting || !selectedDoc?.isFullyIndexed}
                className="w-full sm:w-auto h-9 px-5 gap-2 text-xs bg-[#0037b0] hover:bg-[#1d4ed8] text-white rounded font-sans font-medium shadow-2xs cursor-pointer transition-colors shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />
                    <span>Memproses Outline...</span>
                  </>
                ) : (
                  <>
                    <Sparkle size={14} weight="fill" />
                    <span>Buat Kerangka Outline</span>
                    <ArrowRight size={14} weight="bold" />
                  </>
                )}
              </Button>
            </div>

          </div>

          {/* Right Column: Live Structural Anatomy & Scientific Integrity (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Card: Live Structural Anatomy */}
            <Card className="p-5 border-[#e5e7eb] bg-white rounded-lg shadow-2xs space-y-3.5 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-[#f0eded]">
                <div>
                  <h3 className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
                    Anatomi Kerangka Template
                  </h3>
                  <p className="text-[11px] text-[#747686] mt-0.5 font-sans">
                    Struktur IMRaD yang akan terbentuk secara otomatis:
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-sans font-medium border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">
                  iciCos IEEE
                </Badge>
              </div>

              {/* Section Preview List */}
              <div className="space-y-2.5">
                {/* I. Introduction */}
                <div className="p-3 rounded bg-[#fcf9f8] border border-[#e5e7eb] text-xs space-y-1 hover:border-[#c4c5d7] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1c1b1b] font-sans">I. Introduction</span>
                    <span className="text-[10px] text-[#006c4a] bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.2 rounded font-sans font-medium">3 Field</span>
                  </div>
                  <p className="text-[11px] text-[#747686] leading-relaxed font-sans">
                    Latar Belakang & Urgensi, Problem Statement / Gap, Tujuan Riset & Kontribusi.
                  </p>
                </div>

                {/* II. Related Work */}
                <div className="p-3 rounded bg-[#fcf9f8] border border-[#e5e7eb] text-xs space-y-1 hover:border-[#c4c5d7] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1c1b1b] font-sans">II. Related Work</span>
                    <span className="text-[10px] text-[#006c4a] bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.2 rounded font-sans font-medium">2 Field</span>
                  </div>
                  <p className="text-[11px] text-[#747686] leading-relaxed font-sans">
                    Tinjauan Literatur Terdahulu, State-of-the-Art, dan Komparasi Model.
                  </p>
                </div>

                {/* III. Methodology */}
                <div className="p-3 rounded bg-[#fcf9f8] border border-[#e5e7eb] text-xs space-y-1 hover:border-[#c4c5d7] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1c1b1b] font-sans">III. Methodology</span>
                    <span className="text-[10px] text-[#006c4a] bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.2 rounded font-sans font-medium">3 Field</span>
                  </div>
                  <p className="text-[11px] text-[#747686] leading-relaxed font-sans">
                    Desain Eksperimen, Arsitektur Solusi / Alur Sistem, Dataset & Parameter Uji.
                  </p>
                </div>

                {/* IV. Results and Discussion */}
                <div className="p-3 rounded bg-[#fcf9f8] border border-[#e5e7eb] text-xs space-y-1 hover:border-[#c4c5d7] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1c1b1b] font-sans">IV. Results and Discussion</span>
                    <span className="text-[10px] text-[#006c4a] bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.2 rounded font-sans font-medium">2 Field</span>
                  </div>
                  <p className="text-[11px] text-[#747686] leading-relaxed font-sans">
                    Hasil Temuan Empiris, Evaluasi Metrik, dan Pembahasan Temuan Ilmiah.
                  </p>
                </div>

                {/* V. Conclusion */}
                <div className="p-3 rounded bg-[#fcf9f8] border border-[#e5e7eb] text-xs space-y-1 hover:border-[#c4c5d7] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1c1b1b] font-sans">V. Conclusion & References</span>
                    <span className="text-[10px] text-[#006c4a] bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.2 rounded font-sans font-medium">2 Field</span>
                  </div>
                  <p className="text-[11px] text-[#747686] leading-relaxed font-sans">
                    Kesimpulan Pokok, Keterbatasan, Arah Riset, dan Sitasi Numerik IEEE [1].
                  </p>
                </div>
              </div>
            </Card>

            {/* Card: Research Guardrails */}
            <Card className="p-5 border-[#e5e7eb] bg-[#f7f6f3] rounded-lg shadow-2xs space-y-3 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1b1b] font-sans">
                <ShieldCheck size={18} weight="fill" className="text-[#006c4a]" />
                <span>Integritas Akademik & Anti-Halusinasi</span>
              </div>

              <div className="space-y-2.5 text-[11px] text-[#434655] font-sans leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#1c1b1b]">Klaim Berbasis Sumber:</strong> Butir-butir kerangka hanya disintesis dari kutipan dokumen literatur terindeks.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#1c1b1b]">Traceability Sitasi:</strong> Setiap klaim menyertakan nomor halaman dan identitas chunk sumber PDF.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] shrink-0 mt-1.5" />
                  <span>
                    <strong className="text-[#1c1b1b]">Ekspor Standar Prosiding:</strong> Struktur outline langsung siap diekspor menjadi paket LaTeX (.tex + .bib) dan file DOCX.
                  </span>
                </div>
              </div>
            </Card>

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
