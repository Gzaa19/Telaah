"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  FileCode,
  ArrowLeft,
  CheckCircle,
  WarningCircle,
  Clock,
  DownloadSimple,
  Play,
  Article,
  Eye,
  MagnifyingGlass,
  ArrowSquareOut,
  Sparkle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

const SAMPLE_TEX = `\\documentclass[conference]{IEEEtran}
\\IEEEoverridecommandlockouts
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}

\\def\\BibTeX{{\\rm B\\kern-.05em{\\sc i\\kern-.025em b}\\kern-.08em
    T\\kern-.1667em\\lower.7ex\\hbox{E}\\kern-.125emX}}

\\begin{document}

\\title{Multi-Aspect Semantic Synthesis for Academic Papers Using State-Space Hyena Architectures\\\\
{\\footnotesize \\textsuperscript{*}iciCos 2026 Conference Draft}}

\\author{\\IEEEauthorblockN{Gaza Al Ghozali Chansa}
\\IEEEauthorblockA{\\textit{Department of Informatics} \\\\
\\textit{Institut Teknologi Bandung}\\\\
Bandung, Indonesia}
}

\\maketitle

\\begin{abstract}
Traditional multi-document scientific synthesis often suffers from quadratic computational complexity when processing long bibliographies. In this study, we evaluate state-space selective projections combined with local pgvector embeddings to construct traceable academic manuscripts.
\\end{abstract}

\\begin{IEEEkeywords}
Scientific Paper AI, Retrieval-Augmented Generation, State-Space Models, iciCos.
\\end{IEEEkeywords}

\\section{Introduction}
Food waste management and data-driven sustainability strategies have emerged as critical global challenges \\cite{shadid2025systematic}. According to the Food Waste Index Report \\cite{unep2024food}, nearly one-third of all food produced is lost.

\\section{Related Work}
Existing deep learning approaches predominantly focus on downstream waste-to-energy conversion \\cite{shadid2025systematic}. In contrast, our framework couples local vector retrieval with human-in-the-loop verification.

\\bibliographystyle{IEEEtran}
\\bibliography{references}

\\end{document}`;

const SAMPLE_BIB = `@article{shadid2025systematic,
  author    = {Nada Shadid and Vian Ahmed and Zied Bahroun},
  title     = {A systematic review of data-driven approaches to food waste and loss management},
  journal   = {Cleaner Waste Systems},
  volume    = {12},
  pages     = {100448},
  year      = {2025},
  publisher = {Elsevier},
  doi       = {10.1016/j.clwas.2025.100448}
}

@techreport{unep2024food,
  author      = {{United Nations Environment Programme}},
  title       = {Food Waste Index Report 2024: Think Eat Save},
  institution = {UNEP},
  year        = {2024},
  address     = {Nairobi, Kenya}
}`;

interface CitationRow {
  key: string;
  num: number;
  title: string;
  section: string;
  page: string;
  status: "verified" | "needs_review";
}

const CITATIONS: CitationRow[] = [
  {
    key: "shadid2025systematic",
    num: 1,
    title: "A systematic review of data-driven approaches to food waste and loss management",
    section: "II. Related Work",
    page: "Halaman 17",
    status: "verified",
  },
  {
    key: "unep2024food",
    num: 2,
    title: "Food Waste Index Report 2024: Think Eat Save",
    section: "I. Introduction",
    page: "Halaman 2",
    status: "verified",
  },
];

export default function LatexPreviewPage() {
  const [activeTab, setActiveTab] = useState<"tex" | "bib" | "citations">("tex");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileMessage, setCompileMessage] = useState<string>("Draft Terverifikasi (iciCos / IEEE)");

  const handleCompile = () => {
    setIsCompiling(true);
    setCompileMessage("Compiling LaTeX engine (pdflatex)...");
    setTimeout(() => {
      setIsCompiling(false);
      setCompileMessage("Draf siap ditinjau (0 error, 0 sitasi belum terselesaikan)");
    }, 800);
  };

  return (
    <WorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden bg-[#fcf9f8] text-[#1c1b1b]">
        {/* Top Header */}
        <header className="h-11 border-b border-[#e5e7eb] bg-[#f7f6f3] px-4 md:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/workspace/paper" className="text-[#747686] hover:text-[#1c1b1b] transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-sm md:text-base font-medium text-[#1c1b1b]">
                LaTeX / BibTeX & PDF Preview (iciCos / IEEE)
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono border-[#a7f3d0] text-[#065f46] bg-[#ecfdf5]">
                {compileMessage}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCompile}
              disabled={isCompiling}
              className="h-7.5 text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] gap-1.5 cursor-pointer rounded shadow-2xs"
            >
              <Play size={11} weight="fill" className="text-[#006c4a]" />
              <span>{isCompiling ? "Compiling..." : "Kompilasi LaTeX"}</span>
            </Button>
            <Button
              size="sm"
              className="h-7.5 text-xs bg-[#1d4ed8] hover:bg-[#1e40af] text-white gap-1.5 shadow-2xs cursor-pointer rounded"
            >
              <DownloadSimple size={13} weight="bold" />
              <span>Unduh Paket (.tex + .bib)</span>
            </Button>
          </div>
        </header>

        {/* Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
          {/* Left Column: Code / BibTeX / Citation Table */}
          <div className="flex flex-col border-r border-[#e5e7eb] bg-white overflow-hidden text-left">
            {/* View Tabs */}
            <div className="flex items-center border-b border-[#e5e7eb] bg-[#f7f6f3] px-4 pt-1.5 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab("tex")}
                className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === "tex"
                    ? "border-[#1d4ed8] text-[#1d4ed8]"
                    : "border-transparent text-[#747686] hover:text-[#1c1b1b]"
                }`}
              >
                main.tex
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bib")}
                className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === "bib"
                    ? "border-[#1d4ed8] text-[#1d4ed8]"
                    : "border-transparent text-[#747686] hover:text-[#1c1b1b]"
                }`}
              >
                references.bib
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("citations")}
                className={`px-3 py-2 border-b-2 font-medium transition-colors cursor-pointer ${
                  activeTab === "citations"
                    ? "border-[#1d4ed8] text-[#1d4ed8]"
                    : "border-transparent text-[#747686] hover:text-[#1c1b1b]"
                }`}
              >
                Tabel Validasi Sitasi ({CITATIONS.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-[#1c1b1b]">
              {activeTab === "tex" && (
                <pre className="p-4 bg-[#fcf9f8] border border-[#e5e7eb] rounded whitespace-pre-wrap leading-relaxed">
                  {SAMPLE_TEX}
                </pre>
              )}

              {activeTab === "bib" && (
                <pre className="p-4 bg-[#fcf9f8] border border-[#e5e7eb] rounded whitespace-pre-wrap leading-relaxed text-[#1d4ed8]">
                  {SAMPLE_BIB}
                </pre>
              )}

              {activeTab === "citations" && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#f7f6f3] border border-[#e5e7eb] rounded text-xs font-sans text-[#434655] flex items-center justify-between">
                    <span>Ringkasan Validasi: 2 sitasi terverifikasi, 0 klaim tanpa sumber.</span>
                    <Badge variant="outline" className="text-[10px] font-mono border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]">
                      Format: IEEE Numeric
                    </Badge>
                  </div>

                  <div className="overflow-x-auto border border-[#e5e7eb] rounded">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] bg-[#f7f6f3] text-[10.5px] font-mono text-[#747686] uppercase tracking-wider">
                          <th className="p-2.5 w-10">No</th>
                          <th className="p-2.5">Kunci BibTeX</th>
                          <th className="p-2.5">Judul Paper Rujukan</th>
                          <th className="p-2.5">Halaman</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0eded]">
                        {CITATIONS.map((c) => (
                          <tr key={c.key} className="hover:bg-[#f7f6f3] transition-colors">
                            <td className="p-2.5 font-mono text-[#1d4ed8] font-bold">[{c.num}]</td>
                            <td className="p-2.5 font-mono text-[#1c1b1b] text-[11px]">{c.key}</td>
                            <td className="p-2.5 font-medium text-[#1c1b1b]">{c.title}</td>
                            <td className="p-2.5 font-mono text-[#747686]">{c.page}</td>
                            <td className="p-2.5">
                              <Badge variant="success" className="text-[10px] bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0] font-mono">
                                Verified
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: PDF Preview Simulation (Two-column iciCos/IEEE layout) */}
          <div className="flex flex-col bg-[#f7f6f3] p-6 overflow-y-auto items-center justify-start">
            <div className="w-full max-w-lg bg-white text-[#1c1b1b] shadow-md border border-[#e5e7eb] p-8 rounded font-serif text-[11px] leading-snug space-y-4">
              {/* Paper Title Header */}
              <div className="text-center space-y-1.5 pb-2 border-b border-[#e5e7eb]">
                <h2 className="text-sm font-bold tracking-tight text-[#1c1b1b] font-serif leading-tight">
                  Multi-Aspect Semantic Synthesis for Academic Papers Using State-Space Hyena Architectures
                </h2>
                <div className="text-[10px] text-[#434655] font-sans">
                  Gaza Al Ghozali Chansa · Department of Informatics, Institut Teknologi Bandung
                </div>
                <div className="text-[9px] font-mono text-[#747686]">
                  Target: 2026 8th International Conference on Informatics and Computing (iciCos / IEEE)
                </div>
              </div>

              {/* Abstract */}
              <div className="bg-[#f7f6f3] p-2.5 rounded text-[10px] text-[#1c1b1b] font-sans italic leading-relaxed border border-[#e5e7eb]">
                <strong>Abstract</strong>—Traditional multi-document scientific synthesis often suffers from quadratic computational complexity when processing long bibliographies. In this study, we evaluate state-space selective projections combined with local pgvector embeddings to construct traceable academic manuscripts.
              </div>

              {/* Two Column Simulated Text */}
              <div className="grid grid-cols-2 gap-4 text-justify font-serif text-[10px] leading-relaxed">
                <div className="space-y-2">
                  <h3 className="font-sans font-bold text-[10px] uppercase tracking-wider text-[#1c1b1b] border-b border-[#e5e7eb] pb-0.5">
                    I. Introduction
                  </h3>
                  <p>
                    Food waste management and data-driven sustainability strategies have emerged as critical global challenges [1]. According to the Food Waste Index Report [2], nearly one-third of all food produced for human consumption is lost or wasted globally, imposing severe economic burdens.
                  </p>
                  <p>
                    Recent systematic evaluations demonstrate that machine learning models have achieved remarkable accuracy in forecasting demand and evaluating waste-to-energy pathways [1].
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-sans font-bold text-[10px] uppercase tracking-wider text-[#1c1b1b] border-b border-[#e5e7eb] pb-0.5">
                    II. Related Work
                  </h3>
                  <p>
                    Existing deep learning approaches predominantly focus on downstream anaerobic digestion yield prediction [1] or superficial image classification. While these methods demonstrate commendable computational accuracy within controlled benchmarks, their application to holistic supply-chain reduction remains fragmented.
                  </p>
                </div>
              </div>

              {/* References Section */}
              <div className="pt-2 border-t border-[#e5e7eb] text-[9px] font-sans text-[#434655] space-y-1">
                <div className="font-bold uppercase tracking-wider text-[#1c1b1b]">References</div>
                <div>
                  [1] N. Shadid, V. Ahmed, and Z. Bahroun, "A systematic review of data-driven approaches to food waste and loss management," <em>Cleaner Waste Systems</em>, vol. 12, p. 100448, 2025.
                </div>
                <div>
                  [2] United Nations Environment Programme, "Food Waste Index Report 2024: Think Eat Save," UNEP, Nairobi, 2024.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
