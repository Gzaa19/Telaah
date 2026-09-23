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
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mt-6">
      {/* Header bar */}
      <div
        className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <MagnifyingGlass weight="bold" className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Verifikasi Semantic Similarity Search (pgvector HNSW)
            </h3>
            <p className="text-xs text-slate-400">
              Uji coba penelusuran semantik lokal menggunakan model embedding multilingual E5
            </p>
          </div>
        </div>
        <span className="text-xs text-indigo-400 font-medium hover:underline">
          {isOpen ? "Tutup Panel" : "Buka Panel Uji"}
        </span>
      </div>

      {isOpen && (
        <div className="p-5 space-y-4">
          {/* Query input form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik topik riset atau konsep ilmiah (cth: efisiensi perovskite solar cell)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <ArrowClockwise weight="bold" className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MagnifyingGlass weight="bold" className="w-3.5 h-3.5" />
              )}
              <span>Cari Vektor</span>
            </button>
          </form>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg flex items-center gap-2">
              <WarningCircle weight="fill" className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Results display */}
          {results && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Ditemukan <strong>{results.total_results}</strong> potongan chunk relevan:
                </span>
                <span className="text-[11px] text-slate-500">
                  Model: intfloat/multilingual-e5-base
                </span>
              </div>

              {results.results.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Tidak ada chunk yang cocok dengan skor kemiripan memadai.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {results.results.map((item, idx) => (
                    <div
                      key={item.chunk_id || idx}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-200 truncate max-w-xs flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            {item.document_title || "Dokumen"}
                          </span>
                          {item.page_number && (
                            <span className="text-[11px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              Halaman {item.page_number}
                            </span>
                          )}
                          {item.section_name && (
                            <span className="text-[11px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                              {item.section_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-500 font-mono">
                            Chunk #{item.chunk_index}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full font-mono text-[10px]">
                            Skor: {(item.similarity_score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3 bg-slate-900/50 p-2.5 rounded border border-slate-850">
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
