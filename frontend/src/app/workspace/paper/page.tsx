"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Article,
  CheckCircle,
  Clock,
  Sparkle,
  Books,
  Bookmarks,
  Database,
  ArrowRight,
  ArrowClockwise,
  ArrowLeft,
  FloppyDisk,
  FileCode,
  ShareNetwork,
  Eye,
  X,
  ListNumbers,
  PencilSimple,
  Quotes,
  Check,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

interface PaperSection {
  id: string;
  title: string;
  status: "reviewed" | "draft" | "not_started";
  citationsCount: number;
}

const SECTIONS: PaperSection[] = [
  { id: "title", title: "Title & Authors", status: "reviewed", citationsCount: 0 },
  { id: "abstract", title: "Abstract & Keywords", status: "reviewed", citationsCount: 0 },
  { id: "intro", title: "I. Introduction", status: "reviewed", citationsCount: 5 },
  { id: "related", title: "II. Related Work", status: "draft", citationsCount: 3 },
  { id: "method", title: "III. Methodology", status: "draft", citationsCount: 2 },
  { id: "results", title: "IV. Results & Evaluation", status: "not_started", citationsCount: 0 },
  { id: "discussion", title: "V. Discussion", status: "not_started", citationsCount: 0 },
  { id: "conclusion", title: "VI. Conclusion", status: "not_started", citationsCount: 0 },
  { id: "references", title: "References (BibTeX)", status: "reviewed", citationsCount: 10 },
];

export default function PaperWorkspacePage() {
  const [activeSectionId, setActiveSectionId] = useState<string>("related");
  const [isRagModalOpen, setIsRagModalOpen] = useState(false);
  const [editorContent, setEditorContent] = useState<string>(
    `Traditional deep learning models for food waste management often focus on isolated downstream tasks such as anaerobic digestion yield prediction [1] or superficial image classification. While these methods demonstrate commendable computational accuracy within controlled laboratory benchmarks, their application to holistic supply-chain reduction remains fragmented.\n\nRecent bibliometric and systematic evaluations emphasize that predictive modeling must transition toward multi-aspect systemic integration [2]. By unifying upstream inventory forecasting with real-time sensor feedback, data-driven frameworks can mitigate both production loss and environmental footprint across agricultural and hospitality sectors.`
  );
  const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>("Tersimpan lokal");

  const activeSection = SECTIONS.find((s) => s.id === activeSectionId) || SECTIONS[3];

  const handleSimulateRAG = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedDraft(
        "According to comprehensive PRISMA-guided bibliometric findings by Shadid et al. [1], data-driven solutions are heavily concentrated at lower tiers of the waste hierarchy, notably in bio-methane yield forecasting and waste-to-energy conversion. However, high-tier preventive strategies such as algorithmic redistribution and real-time freshness tracking remain underrepresented in the current literature, underscoring the necessity for integrated, cross-sectoral AI architectures [1, p. 17]."
      );
      setIsGenerating(false);
    }, 900);
  };

  const handleAcceptDraft = () => {
    if (generatedDraft) {
      setEditorContent((prev) => prev + "\n\n" + generatedDraft);
      setGeneratedDraft(null);
      setIsRagModalOpen(false);
      setSaveStatus("Tersimpan setelah penambahan");
    }
  };

  return (
    <WorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden bg-[#fcf9f8] text-[#1c1b1b]">
        {/* Workspace Top Toolbar */}
        <header className="h-11 border-b border-[#e5e7eb] bg-[#f7f6f3] px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-[#747686] hover:text-[#1c1b1b] transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex flex-col text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm md:text-base font-medium text-[#1c1b1b] truncate max-w-md">
                  Multi-Aspect Semantic Synthesis for Academic Papers
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-[#bfdbfe] text-[#1d4ed8] bg-[#eff6ff] shrink-0">
                  iciCos / IEEE
                </Badge>
              </div>
              <span className="text-[10px] font-mono text-[#747686]">
                Status: Dalam Penulisan (IMRaD) · {saveStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSaveStatus("Menyimpan draf...");
                setTimeout(() => setSaveStatus("Tersimpan lokal"), 600);
              }}
              className="h-7.5 text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] gap-1.5 cursor-pointer rounded shadow-2xs"
            >
              <FloppyDisk size={13} />
              <span className="hidden sm:inline">Simpan Draf</span>
            </Button>
            <Link href="/workspace/latex-preview">
              <Button
                variant="outline"
                size="sm"
                className="h-7.5 text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] gap-1.5 cursor-pointer rounded shadow-2xs"
              >
                <FileCode size={13} className="text-[#1d4ed8]" />
                <span className="hidden sm:inline">LaTeX / BibTeX</span>
              </Button>
            </Link>
            <Link href="/workspace/latex-preview">
              <Button
                size="sm"
                className="h-7.5 text-xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white gap-1.5 shadow-2xs cursor-pointer rounded"
              >
                <Eye size={13} />
                <span>Preview PDF</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Three-Pane Desktop Editorial Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Outline Navigation (260px) */}
          <aside className="w-64 border-r border-[#e5e7eb] bg-[#f7f6f3] flex flex-col shrink-0 overflow-y-auto">
            <div className="p-3 border-b border-[#e5e7eb] text-[10.5px] font-mono font-semibold text-[#747686] uppercase tracking-wider text-left">
              Outline Naskah (IMRaD)
            </div>
            <nav className="p-2 space-y-0.5">
              {SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    activeSectionId === sec.id
                      ? "bg-[#1d4ed8]/10 text-[#1d4ed8] border-l-2 border-[#1d4ed8] font-semibold rounded-r"
                      : "text-[#434655] hover:text-[#1c1b1b] hover:bg-[#eae7e7] border-l-2 border-transparent rounded-r"
                  }`}
                >
                  <span className="truncate pr-2">{sec.title}</span>
                  {sec.status === "reviewed" && (
                    <Badge variant="success" className="text-[9.5px] px-1 py-0 h-4 bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0] font-mono">
                      Reviewed
                    </Badge>
                  )}
                  {sec.status === "draft" && (
                    <Badge variant="info" className="text-[9.5px] px-1 py-0 h-4 bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] font-mono">
                      Draft
                    </Badge>
                  )}
                  {sec.status === "not_started" && (
                    <span className="text-[9.5px] font-mono text-[#747686]">Kosong</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-auto p-3 border-t border-[#e5e7eb] bg-[#f7f6f3] text-[11px] text-[#747686] space-y-1 text-left">
              <div className="font-semibold text-[#1c1b1b]">Format Sitasi: IEEE Numeric</div>
              <div>Target: iciCos 2026 Proceedings</div>
            </div>
          </aside>

          {/* Center Pane: Manuscript Editor (fluid, reading width) */}
          <main className="flex-1 flex flex-col overflow-y-auto bg-[#fcf9f8] px-6 py-6 items-center">
            <div className="w-full max-w-3xl space-y-5 text-left">
              {/* Section Header */}
              <div className="pb-3 border-b border-[#e5e7eb] flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-[#1c1b1b]">
                    {activeSection.title}
                  </h2>
                  <p className="text-xs font-mono text-[#747686] mt-0.5">
                    {editorContent.split(/\s+/).filter(Boolean).length} Kata · 3 Sitasi Aktif
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsRagModalOpen(true)}
                  className="text-xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white gap-1.5 cursor-pointer shadow-2xs rounded"
                >
                  <Sparkle size={13} weight="bold" />
                  <span>Asistensi RAG</span>
                </Button>
              </div>

              {/* Manuscript Text Editor */}
              <div className="relative">
                <textarea
                  value={editorContent}
                  onChange={(e) => {
                    setEditorContent(e.target.value);
                    setSaveStatus("Perubahan belum disimpan");
                  }}
                  rows={14}
                  className="w-full p-4 bg-white border border-[#e5e7eb] rounded text-sm text-[#1c1b1b] leading-relaxed font-sans focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] resize-y shadow-2xs"
                  placeholder="Tulis draf paragraf ilmiah untuk bagian ini..."
                />
              </div>

              {/* Academic Citations in this section */}
              <div className="p-3.5 bg-white border border-[#e5e7eb] rounded space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-mono text-[#747686]">
                  <span className="font-semibold text-[#1c1b1b] flex items-center gap-1.5">
                    <Bookmarks size={14} className="text-[#1d4ed8]" />
                    <span>Sitasi IEEE Tersemat di Bagian Ini</span>
                  </span>
                  <span>2 Sumber Terindeks pgvector</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 bg-[#f7f6f3] border border-[#e5e7eb] rounded flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-mono text-[#1d4ed8] font-bold">[1]</span>
                      <span className="text-[#1c1b1b] truncate font-sans">
                        N. Shadid, V. Ahmed, Z. Bahroun (2025). Cleaner Waste Systems
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46] shrink-0 font-medium">
                      Hal. 17 (Traceable)
                    </Badge>
                  </div>

                  <div className="p-2.5 bg-[#f7f6f3] border border-[#e5e7eb] rounded flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-mono text-[#1d4ed8] font-bold">[2]</span>
                      <span className="text-[#1c1b1b] truncate font-sans">
                        UN Environment Programme (2024). Food Waste Index Report
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46] shrink-0 font-medium">
                      Hal. 2 (Traceable)
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Right Pane: Inspector / Retrieved Sources (340px) */}
          <aside className="w-80 border-l border-[#e5e7eb] bg-[#f7f6f3] p-4 flex flex-col shrink-0 overflow-y-auto space-y-3 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
              <span className="text-xs font-mono font-semibold text-[#1c1b1b] flex items-center gap-1.5">
                <Database size={14} className="text-[#1d4ed8]" />
                <span>Sumber Relevan (pgvector)</span>
              </span>
              <span className="text-[10px] font-mono text-[#006c4a] bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-0.5 rounded font-medium">
                Cosine HNSW
              </span>
            </div>

            <div className="space-y-3">
              {/* Source Card 1 */}
              <Card className="p-3 bg-white border-[#e5e7eb] text-left space-y-2 hover:border-[#c4c5d7] transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_-1px_rgba(15,23,42,0.02)] rounded">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#1d4ed8] font-bold">[SRC-001]</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]">
                    Skor: 0.82
                  </Badge>
                </div>
                <p className="text-xs font-medium text-[#1c1b1b] line-clamp-2">
                  1-s2.0-S2772912525002465-main.pdf
                </p>
                <div className="text-[11px] text-[#747686] font-mono">
                  Halaman 17 · Bab 5 Discussion & Future Work
                </div>
                <div className="p-2 bg-[#fcf9f8] rounded border border-[#e5e7eb] text-[11px] text-[#434655] italic line-clamp-3">
                  &ldquo;This pattern reveals that the domain is innovation-heavy but synthesis-light. The scarcity of review papers indicates limited theoretical consolidation...&rdquo;
                </div>
                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-[#006c4a] font-mono font-medium">✓ Traceable</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditorContent((prev) => prev + " [1]");
                      setSaveStatus("Sitasi [1] disisipkan");
                    }}
                    className="h-6.5 text-[10px] border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] cursor-pointer rounded"
                  >
                    Sisipkan Sitasi
                  </Button>
                </div>
              </Card>

              {/* Source Card 2 */}
              <Card className="p-3 bg-white border-[#e5e7eb] text-left space-y-2 hover:border-[#c4c5d7] transition-all shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_-1px_rgba(15,23,42,0.02)] rounded">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#1d4ed8] font-bold">[SRC-002]</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-[#e5e7eb] text-[#747686]">
                    Skor: 0.76
                  </Badge>
                </div>
                <p className="text-xs font-medium text-[#1c1b1b] line-clamp-2">
                  1-s2.0-S2772912525002465-main.pdf
                </p>
                <div className="text-[11px] text-[#747686] font-mono">
                  Halaman 4 · Sub-bab 3.1 Reduction Strategies
                </div>
                <div className="p-2 bg-[#fcf9f8] rounded border border-[#e5e7eb] text-[11px] text-[#434655] italic line-clamp-3">
                  &ldquo;Machine learning techniques such as random forest, gradient boosting, and LSTM networks have demonstrated substantial predictive accuracy...&rdquo;
                </div>
              </Card>
            </div>
          </aside>
        </div>

        {/* Focused RAG Generation Modal: "Generate with Verified Sources" */}
        {isRagModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl bg-white border border-[#e5e7eb] rounded shadow-2xl p-6 flex flex-col gap-4 text-[#1c1b1b] text-left">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-[#e5e7eb]">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkle size={18} weight="fill" className="text-[#1d4ed8]" />
                    <h3 className="font-serif text-lg font-medium text-[#1c1b1b]">
                      Asistensi RAG: Sintesis Berbasis Sumber Terverifikasi
                    </h3>
                  </div>
                  <p className="text-xs text-[#434655] mt-0.5">
                    Target Bagian: <span className="font-mono text-[#1c1b1b] font-medium">{activeSection.title}</span> (Template iciCos/IEEE)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRagModalOpen(false)}
                  className="text-[#747686] hover:text-[#1c1b1b] p-1 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Source Scope Selection */}
              <div className="p-3 bg-[#f7f6f3] border border-[#e5e7eb] rounded space-y-2">
                <div className="text-xs font-mono font-semibold text-[#1c1b1b] flex items-center justify-between">
                  <span>Cakupan Sumber Dokumen yang Dipilih:</span>
                  <span className="text-[#006c4a]">1 Dokumen Terpilih</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#1c1b1b]">
                  <input type="checkbox" defaultChecked className="rounded border-[#e5e7eb] text-[#1d4ed8]" />
                  <span className="font-mono text-[11px] truncate">1-s2.0-S2772912525002465-main.pdf (Halaman 17, Skor: 0.82)</span>
                </div>
              </div>

              {/* Academic Generation Rules */}
              <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded text-xs text-[#1d4ed8] space-y-1">
                <span className="font-semibold text-[#1d4ed8]">Batasan Ilmiah (Anti-Halusinasi):</span>
                <ul className="list-disc list-inside text-[11px] text-[#1e40af] space-y-0.5">
                  <li>Hanya mensintesis klaim yang tertera dalam chunk sumber.</li>
                  <li>Sertakan nomor sitasi IEEE [1] dan nomor halaman asli.</li>
                  <li>Keputusan penambahan ke naskah berada penuh di tangan peneliti (Human-in-the-Loop).</li>
                </ul>
              </div>

              {/* Draft Generation Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1c1b1b]">
                    Hasil Rekomendasi Draf Paragraf:
                  </label>
                  {!generatedDraft && (
                    <Button
                      size="sm"
                      onClick={handleSimulateRAG}
                      disabled={isGenerating}
                      className="h-7 text-xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white cursor-pointer rounded"
                    >
                      {isGenerating ? "Menganalisis Vektor..." : "Buat Draf Paragraf"}
                    </Button>
                  )}
                </div>

                {generatedDraft ? (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-[#fcf9f8] border border-[#e5e7eb] rounded text-xs text-[#1c1b1b] leading-relaxed font-sans">
                      {generatedDraft}
                    </div>

                    {/* Honest Verification Metrics */}
                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#747686]">
                      <span className="text-[#006c4a] flex items-center gap-1 font-medium">
                        <Check size={12} weight="bold" /> 2 Sitasi Terverifikasi
                      </span>
                      <span>·</span>
                      <span className="text-[#006c4a] font-medium">Hal. 17 Traceable</span>
                      <span>·</span>
                      <span>0 Klaim Tanpa Sumber</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-[#747686] border border-dashed border-[#e5e7eb] rounded">
                    Klik &ldquo;Buat Draf Paragraf&rdquo; untuk menyintesis teks berdasarkan chunk pgvector terpilih.
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e7eb]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRagModalOpen(false)}
                  className="text-xs cursor-pointer border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] rounded"
                >
                  Abaikan
                </Button>
                {generatedDraft && (
                  <Button
                    size="sm"
                    onClick={handleAcceptDraft}
                    className="text-xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white gap-1.5 cursor-pointer shadow-2xs rounded"
                  >
                    <CheckCircle size={14} weight="bold" />
                    <span>Terapkan ke Draf Naskah</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
