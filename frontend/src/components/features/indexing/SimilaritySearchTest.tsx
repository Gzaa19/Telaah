"use client";

import React, { useState } from "react";
import {
  MagnifyingGlass,
  FileText,
  Quotes,
  CheckCircle,
  WarningCircle,
  ArrowClockwise,
  Hash,
} from "@phosphor-icons/react";
import { SimilaritySearchResponse } from "@/types/indexing";
import { verifySimilaritySearch } from "@/lib/api/indexing";

interface SimilaritySearchTestProps {
  documentId?: string;
  defaultOpen?: boolean;
}

export function SimilaritySearchTest({
  documentId,
  defaultOpen = false,
}: SimilaritySearchTestProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SimilaritySearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await verifySimilaritySearch(query.trim(), documentId, 5);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Gagal melakukan pencarian semantik.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#e5e7eb] rounded overflow-hidden shadow-[0_1px_3px_0_rgba(15,23,42,0.04),0_1px_2px_-1px_rgba(15,23,42,0.02)] mt-6">
      {/* Header bar */}
      <div
        className="px-5 py-3.5 border-b border-[#e5e7eb] bg-[#f7f6f3] flex items-center justify-between cursor-pointer hover:bg-[#eae7e7] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#eff6ff] text-[#1d4ed8] rounded border border-[#bfdbfe]">
            <MagnifyingGlass weight="bold" className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[#1c1b1b]">
              Uji Penelusuran Semantik Dokumen
            </h3>
            <p className="text-xs text-[#434655]">
              Temukan kutipan dan pembahasan relevan dari seluruh dokumen ilmiah yang telah diindeks.
            </p>
          </div>
        </div>
        <span className="text-xs text-[#1d4ed8] font-medium hover:underline">
          {isOpen ? "Tutup Panel" : "Buka Panel Uji"}
        </span>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4 bg-white text-left">
          {/* Query input form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik topik riset atau konsep ilmiah (cth: efisiensi perovskite solar cell)..."
                className="w-full bg-[#f7f6f3] border border-[#e5e7eb] rounded px-3.5 py-1.5 text-xs text-[#1c1b1b] placeholder:text-[#747686] focus:outline-none focus:border-[#1d4ed8] focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {isLoading ? (
                <ArrowClockwise weight="bold" className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MagnifyingGlass weight="bold" className="w-3.5 h-3.5" />
              )}
              <span>Cari Relevansi</span>
            </button>
          </form>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-[#ffdad6]/40 border border-[#ffdad6] text-[#ba1a1a] text-xs rounded flex items-center gap-2">
              <WarningCircle weight="fill" className="w-4 h-4 shrink-0 text-[#ba1a1a]" />
              <span>{error}</span>
            </div>
          )}

          {/* Results display */}
          {results && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-[#434655]">
                <span>
                  Ditemukan <strong>{results.total_results}</strong> kutipan relevan:
                </span>
              </div>

              {results.results.length === 0 ? (
                <div className="p-8 text-center text-[#747686] text-xs">
                  Tidak ada kutipan yang cocok dengan kata kunci pencarian.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {results.results.map((item, idx) => (
                    <div
                      key={item.chunk_id || idx}
                      className="p-3.5 bg-[#fcf9f8] border border-[#e5e7eb] rounded hover:border-[#c4c5d7] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-[#1c1b1b] truncate max-w-xs flex items-center gap-1 font-serif">
                            <FileText className="w-3.5 h-3.5 text-[#1d4ed8]" />
                            {item.document_title || "Dokumen"}
                          </span>
                          {item.page_number && (
                            <span className="text-[11px] text-[#434655] bg-white border border-[#e5e7eb] px-1.5 py-0.5 rounded font-mono">
                              Halaman {item.page_number}
                            </span>
                          )}
                          {item.section_name && (
                            <span className="text-[11px] text-[#434655] bg-white border border-[#e5e7eb] px-1.5 py-0.5 rounded truncate max-w-[120px] font-mono">
                              {item.section_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-[#747686] font-mono">
                            Chunk #{item.chunk_index}
                          </span>
                          <span className="px-2 py-0.5 bg-[#ecfdf5] text-[#006c4a] border border-[#a7f3d0] rounded font-mono text-[10.5px] font-medium">
                            Skor: {(item.similarity_score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-[#1c1b1b] leading-relaxed font-sans line-clamp-3 bg-white p-2.5 rounded border border-[#e5e7eb]">
                        &ldquo;{item.chunk_text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
