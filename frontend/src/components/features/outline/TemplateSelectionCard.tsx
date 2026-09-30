"use client";

import React from "react";
import { FileDoc, CheckCircle, SealCheck, Wrench, FileCode, ListNumbers } from "@phosphor-icons/react";

interface TemplateSelectionCardProps {
  id: string;
  name: string;
  organization: string;
  description: string;
  sectionsCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onOpenDiagnostics?: () => void;
  tags?: string[];
}

export function TemplateSelectionCard({
  name,
  organization,
  sectionsCount,
  isSelected,
  onSelect,
  onOpenDiagnostics,
  tags = ["IEEE Format", "DOCX + LaTeX", "YAML Sections"],
}: TemplateSelectionCardProps) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect();
        }
      }}
      className={`relative flex flex-col p-6 rounded-2xl transition-all cursor-pointer border text-left ${
        isSelected
          ? "bg-white border-[#0037b0] shadow-md ring-2 ring-[#0037b0]/20"
          : "bg-[#fcfbf9] border-[#d1c7bd] hover:border-[#b0a79d] hover:bg-white shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isSelected ? "bg-[#e8effd] text-[#0037b0]" : "bg-[#f0ece7] text-[#5c544d]"
            }`}
          >
            <FileDoc size={24} weight={isSelected ? "fill" : "regular"} />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#2c2623] tracking-tight">
              {name}
            </h3>
            <p className="text-xs text-[#786f66] font-medium flex items-center gap-1">
              <SealCheck size={14} className="text-[#006c4a]" weight="fill" />
              {organization}
            </p>
          </div>
        </div>

        <div>
          {isSelected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8effd] text-[#0037b0] text-xs font-semibold">
              <CheckCircle size={16} weight="fill" />
              <span>Terpilih</span>
            </div>
          ) : (
            <span className="text-xs text-[#8c827a] font-mono">Pilih</span>
          )}
        </div>
      </div>

      {/* Role explanation */}
      <div className="mb-4 text-xs text-[#544c45] space-y-1.5 bg-[#fbf9f6] p-3 rounded-xl border border-[#e8e2dc]/80">
        <p className="leading-relaxed">
          <strong className="text-[#2c2623]">Template iciCos / IEEE</strong> untuk struktur heading, metadata paper, dan aturan format publikasi.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[11px] text-[#786f66]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0037b0]" />
            DOCX: Komponen & heading
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]" />
            LaTeX: Struktur ekspor
          </span>
          <span className="flex items-center gap-1 sm:col-span-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8c4b3e]" />
            outline-sections.yaml: Seksi isi penelitian
          </span>
        </div>
      </div>

      {/* Footer info & Diagnostics trigger */}
      <div className="flex items-center justify-between pt-3 border-t border-[#f0ece7] mt-auto text-xs text-[#786f66]">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded bg-[#f3efe9] text-[#5c544d] font-mono text-[11px]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[#0037b0] font-medium text-[11px]">
            {sectionsCount} Komponen
          </span>

          {onOpenDiagnostics && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDiagnostics();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f0ece7] hover:bg-[#e4ded6] text-[#2c2623] text-[11px] font-mono font-medium transition-colors border border-[#d1c7bd]/50"
            >
              <Wrench size={13} />
              <span>Diagnostik</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
