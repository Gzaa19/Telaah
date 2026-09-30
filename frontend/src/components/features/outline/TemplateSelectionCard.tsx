"use client";

import React from "react";
import { FileDoc, CheckCircle, SealCheck, Sparkle, Tag } from "@phosphor-icons/react";

interface TemplateSelectionCardProps {
  id: string;
  name: string;
  organization: string;
  description: string;
  sectionsCount: number;
  isSelected: boolean;
  onSelect: () => void;
  tags?: string[];
}

export function TemplateSelectionCard({
  name,
  organization,
  description,
  sectionsCount,
  isSelected,
  onSelect,
  tags = ["IEEE 2-Column", "IMRaD", "LaTeX & DOCX"],
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
      className={`relative flex flex-col p-6 rounded-xl transition-all cursor-pointer border text-left ${
        isSelected
          ? "bg-white border-[#0037b0] shadow-md ring-2 ring-[#0037b0]/20"
          : "bg-[#fcfbf9] border-[#d1c7bd] hover:border-[#b0a79d] hover:bg-white shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
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

      <p className="text-sm text-[#544c45] line-clamp-3 mb-4 leading-relaxed">
        {description}
      </p>

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
        <span className="font-mono text-[#0037b0] font-medium shrink-0 ml-2">
          {sectionsCount} Bagian Inti
        </span>
      </div>
    </div>
  );
}
