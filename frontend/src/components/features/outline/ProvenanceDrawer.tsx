"use client";

import React from "react";
import {
  FileText,
  Bookmarks,
  ShieldCheck,
  CheckCircle,
  Hash,
  WarningCircle,
  FileDoc,
} from "@phosphor-icons/react";
import { FieldDTO, SourceRefDTO } from "@/types/outlines";

interface ProvenanceDrawerProps {
  activeField: FieldDTO | null;
  sectionTitle?: string;
}

export function ProvenanceDrawer({ activeField, sectionTitle }: ProvenanceDrawerProps) {
  if (!activeField) {
    return (
      <aside className="w-80 bg-white border-l border-[#e5e7eb] flex flex-col shrink-0 p-6 text-center justify-center text-[#747686] font-sans">
        <Bookmarks size={36} weight="thin" className="mx-auto mb-2 text-[#747686]" />
        <p className="text-xs font-semibold text-[#1c1b1b]">Pratinjau Rujukan</p>
        <p className="text-[11px] text-[#747686] mt-1">
          Pilih salah satu butir kerangka di canvas tengah untuk memeriksa kutipan chunk literatur aslinya.
        </p>
      </aside>
    );
  }

  const refs = activeField.source_refs || [];

  return (
    <aside className="w-80 bg-white border-l border-[#e5e7eb] flex flex-col shrink-0 overflow-y-auto text-left">
      {/* Header */}
      <div className="p-4 border-b border-[#f0eded]">
        <div className="flex items-center gap-2">
          <Bookmarks size={16} weight="duotone" className="text-[#0037b0]" />
          <h3 className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
            Bukti Rujukan Sumber
          </h3>
        </div>
        <p className="text-[11px] text-[#747686] mt-1 font-sans truncate">
          {sectionTitle} · <span className="text-[#1c1b1b] font-medium">{activeField.field_label}</span>
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {refs.length === 0 ? (
          <div className="p-4 bg-[#fffbeb] border border-[#fed7aa] rounded text-xs space-y-1.5 font-sans">
            <div className="flex items-center gap-1.5 font-semibold text-[#b45309]">
              <WarningCircle size={15} weight="fill" />
              <span>Memerlukan Input Peneliti</span>
            </div>
            <p className="text-[11px] text-[#92400e] leading-relaxed">
              Butir ini ditandai <code className="bg-white/80 px-1 py-0.2 rounded border border-[#fed7aa] text-[10px] font-mono">[NEEDS INPUT]</code> karena informasi spesifik belum ditemukan dalam literatur yang diindeks.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#747686] font-sans">
              <span>{refs.length} Kutipan Terverifikasi</span>
              <span className="text-[#006c4a] font-medium flex items-center gap-1">
                <ShieldCheck size={13} weight="fill" />
                Traceable
              </span>
            </div>

            {refs.map((ref, idx) => (
              <div
                key={ref.chunk_id || idx}
                className="p-3 rounded bg-[#fcf9f8] border border-[#e5e7eb] space-y-2 hover:border-[#c4c5d7] transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#e5e7eb] text-[10.5px] font-sans font-medium text-[#0037b0]">
                    <FileText size={12} />
                    <span>Halaman {ref.page_number || "N/A"}</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#747686]">
                    Chunk #{idx + 1}
                  </span>
                </div>

                <blockquote className="text-xs text-[#1c1b1b] font-sans leading-relaxed italic bg-white p-2.5 rounded border border-[#e5e7eb] text-left">
                  &ldquo;{ref.excerpt_text}&rdquo;
                </blockquote>
              </div>
            ))}
          </div>
        )}

        {/* Verification Guarantee */}
        <div className="p-3 bg-[#f7f6f3] border border-[#e5e7eb] rounded text-xs text-[#747686] space-y-1 font-sans">
          <span className="font-semibold text-[#1c1b1b] block">Integritas Bukti Riset</span>
          <p className="text-[10.5px] text-[#434655] leading-relaxed">
            Setiap klaim yang disintesis ditautkan langsung ke nomor halaman berkas PDF rujukan Anda untuk mencegah halusinasi.
          </p>
        </div>
      </div>
    </aside>
  );
}
