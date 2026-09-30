"use client";

import React from "react";
import {
  CheckCircle,
  WarningCircle,
  PencilSimple,
  ListNumbers,
  CaretRight,
} from "@phosphor-icons/react";
import { SectionDTO } from "@/types/outlines";

interface SectionTreeNavProps {
  sections: SectionDTO[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
}

export function SectionTreeNav({
  sections,
  activeSectionId,
  onSelectSection,
}: SectionTreeNavProps) {
  const filledCount = sections.filter(
    (s) => s.section_status === "filled" || s.section_status === "edited"
  ).length;

  return (
    <aside className="w-72 bg-white border-r border-[#e5e7eb] flex flex-col shrink-0 overflow-y-auto text-left">
      {/* Header */}
      <div className="p-4 border-b border-[#f0eded]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-[#1c1b1b] uppercase tracking-wider font-sans">
            Struktur Bagian
          </span>
          <span className="text-[11px] font-sans font-medium text-[#747686]">
            {filledCount}/{sections.length} Terisi
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-[#f0eded] h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className="bg-[#0037b0] h-full rounded-full transition-all duration-300"
            style={{ width: `${sections.length > 0 ? (filledCount / sections.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Sections List */}
      <nav className="p-2 space-y-1 flex-1">
        {sections.map((section) => {
          const isActive = section.section_id === activeSectionId;
          const needsInputCount = section.fields.filter((f) => f.is_needs_input).length;
          const isEdited = section.section_status === "edited" || section.fields.some((f) => f.is_edited);

          return (
            <button
              key={section.section_id}
              type="button"
              onClick={() => onSelectSection(section.section_id)}
              className={`w-full flex items-start gap-2.5 p-2.5 rounded text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-[#eff6ff] text-[#0037b0] border border-[#bfdbfe] shadow-2xs font-semibold"
                  : "text-[#434655] hover:text-[#1c1b1b] hover:bg-[#f7f6f3] border border-transparent font-medium"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {needsInputCount > 0 ? (
                  <WarningCircle size={15} weight="fill" className="text-amber-500" />
                ) : isEdited ? (
                  <PencilSimple size={15} weight="bold" className="text-[#0037b0]" />
                ) : (
                  <CheckCircle size={15} weight="fill" className="text-[#006c4a]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs truncate font-sans">{section.title}</span>
                  <CaretRight
                    size={12}
                    className={`shrink-0 transition-transform ${
                      isActive ? "text-[#0037b0] translate-x-0.5" : "text-[#747686]"
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-[#747686] font-sans">
                    {section.fields.length} butir
                  </span>
                  {needsInputCount > 0 && (
                    <span className="text-[9.5px] px-1 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-sans font-medium">
                      {needsInputCount} butuh input
                    </span>
                  )}
                  {isEdited && needsInputCount === 0 && (
                    <span className="text-[9.5px] px-1 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-sans font-medium">
                      diedit
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
