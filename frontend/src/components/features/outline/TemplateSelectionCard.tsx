"use client";

import React from "react";
import { FileDoc, CheckCircle, SealCheck, Wrench } from "@phosphor-icons/react";

interface TemplateSelectionCardProps {
  id: string;
  name: string;
  organization: string;
  formatBadge?: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
  onOpenDiagnostics?: () => void;
}

export function TemplateSelectionCard({
  name,
  organization,
  formatBadge = "IEEE A4 2-Column",
  description,
  isSelected,
  onSelect,
  onOpenDiagnostics,
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
      className={`p-3.5 rounded-lg border transition-all cursor-pointer text-left flex items-start justify-between gap-3 ${
        isSelected
          ? "bg-[#eff6ff]/40 border-[#1d4ed8] shadow-2xs"
          : "bg-white border-[#e5e7eb] hover:border-[#c4c5d7]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
            isSelected
              ? "bg-white text-[#1d4ed8] border border-[#bfdbfe]"
              : "bg-[#f7f6f3] text-[#747686] border border-[#e5e7eb]"
          }`}
        >
          <FileDoc size={20} weight={isSelected ? "fill" : "regular"} />
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-semibold text-[#1c1b1b]">{name}</h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#dbeafe] text-[#1e40af]">
              {formatBadge}
            </span>
          </div>

          <p className="text-xs text-[#52525b] mt-0.5 leading-relaxed">{description}</p>
          <p className="text-[11px] text-[#747686] mt-1 font-medium">{organization}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenDiagnostics && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDiagnostics();
            }}
            className="p-1 rounded text-[#747686] hover:text-[#1c1b1b] hover:bg-[#f7f6f3] transition-colors"
            title="Lihat Detail Template"
          >
            <Wrench size={14} />
          </button>
        )}

        {isSelected && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#166534] font-medium bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#bbf7d0]">
            <CheckCircle size={13} weight="fill" />
            <span>Dipilih</span>
          </span>
        )}
      </div>
    </div>
  );
}
