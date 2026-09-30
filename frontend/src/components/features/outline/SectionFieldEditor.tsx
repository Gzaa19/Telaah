"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkle,
  WarningCircle,
  PencilSimple,
  Check,
  CircleNotch,
  ArrowCounterClockwise,
  Bookmarks,
} from "@phosphor-icons/react";
import { SectionDTO, FieldDTO } from "@/types/outlines";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SectionFieldEditorProps {
  section: SectionDTO;
  activeFieldId: string | null;
  onSelectField: (field: FieldDTO) => void;
  onSaveField: (fieldId: string, content: string) => Promise<void>;
  onRegenerateSection: (sectionId: string) => Promise<void>;
  isRegeneratingSection: boolean;
}

export function SectionFieldEditor({
  section,
  activeFieldId,
  onSelectField,
  onSaveField,
  onRegenerateSection,
  isRegeneratingSection,
}: SectionFieldEditorProps) {
  // Local edit states per field: { [fieldId]: string }
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    const initial: Record<string, string> = {};
    section.fields.forEach((f) => {
      initial[f.field_id] = f.content;
    });
    setFieldValues(initial);
  }, [section]);

  const handleBlur = async (fieldId: string) => {
    const originalField = section.fields.find((f) => f.field_id === fieldId);
    if (!originalField) return;

    const currentVal = fieldValues[fieldId];
    if (currentVal !== undefined && currentVal !== originalField.content) {
      try {
        setSavingFieldId(fieldId);
        await onSaveField(fieldId, currentVal);
        setSavedSuccessId(fieldId);
        setTimeout(() => setSavedSuccessId(null), 2000);
      } catch (err) {
        console.error("Failed to auto-save field:", err);
      } finally {
        setSavingFieldId(null);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#fcf9f8] text-left">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Section Header */}
        <div className="pb-4 border-b border-[#e5e7eb] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1c1b1b]">
                {section.title}
              </h2>
              {section.section_status === "edited" && (
                <Badge variant="outline" className="text-[10px] font-sans border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]">
                  Telah Disunting
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#747686] mt-0.5 font-sans">
              Bagian {section.order_index} dari struktur prosiding template IEEE / iciCos.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onRegenerateSection(section.section_id)}
            disabled={isRegeneratingSection}
            className="h-8 text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] gap-1.5 shadow-2xs font-sans self-start sm:self-auto cursor-pointer"
          >
            {isRegeneratingSection ? (
              <>
                <CircleNotch size={13} className="animate-spin text-[#0037b0]" />
                <span>Menyusun Ulang...</span>
              </>
            ) : (
              <>
                <ArrowCounterClockwise size={13} />
                <span>Regenerasi Bagian Ini</span>
              </>
            )}
          </Button>
        </div>

        {/* Fields List */}
        <div className="space-y-5">
          {section.fields.map((field) => {
            const isSelected = field.field_id === activeFieldId;
            const isSaving = savingFieldId === field.field_id;
            const isSaved = savedSuccessId === field.field_id;
            const currentContent = fieldValues[field.field_id] ?? field.content;

            return (
              <div
                key={field.field_id}
                onClick={() => onSelectField(field)}
                className={`p-4 rounded-lg border transition-all text-left space-y-2.5 ${
                  isSelected
                    ? "bg-white border-[#0037b0] shadow-sm ring-1 ring-[#0037b0]/20"
                    : "bg-white border-[#e5e7eb] hover:border-[#c4c5d7]"
                }`}
              >
                {/* Field Top Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#1c1b1b] font-sans">
                      {field.field_label}
                    </span>
                    {field.is_needs_input && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-sans font-medium">
                        <WarningCircle size={11} weight="fill" />
                        <span>Needs Input</span>
                      </span>
                    )}
                    {field.is_edited && !field.is_needs_input && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-sans font-medium">
                        <PencilSimple size={11} />
                        <span>Diedit</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isSaving && (
                      <span className="text-[10.5px] text-[#747686] flex items-center gap-1 font-sans">
                        <CircleNotch size={11} className="animate-spin" /> Menyimpan...
                      </span>
                    )}
                    {isSaved && (
                      <span className="text-[10.5px] text-[#006c4a] flex items-center gap-1 font-sans font-medium">
                        <Check size={11} weight="bold" /> Tersimpan
                      </span>
                    )}
                    {field.source_refs && field.source_refs.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectField(field);
                        }}
                        className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded bg-[#f7f6f3] hover:bg-[#eae7e7] text-[#0037b0] border border-[#e5e7eb] font-sans cursor-pointer transition-colors"
                      >
                        <Bookmarks size={12} />
                        <span>{field.source_refs.length} Rujukan</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Textarea Input */}
                <textarea
                  value={currentContent}
                  onChange={(e) =>
                    setFieldValues((prev) => ({ ...prev, [field.field_id]: e.target.value }))
                  }
                  onBlur={() => handleBlur(field.field_id)}
                  rows={Math.max(3, Math.min(8, Math.ceil(currentContent.length / 80)))}
                  className={`w-full p-3 rounded text-xs font-sans leading-relaxed border transition-colors resize-y focus:outline-none ${
                    field.is_needs_input
                      ? "bg-[#fffbeb]/50 border-amber-200 text-[#1c1b1b] focus:border-amber-400 focus:bg-white"
                      : "bg-[#fcf9f8] border-[#e5e7eb] text-[#1c1b1b] focus:border-[#0037b0] focus:bg-white"
                  }`}
                  placeholder="Ketik atau sesuaikan poin kerangka di sini..."
                />

                <div className="flex items-center justify-between text-[11px] text-[#747686] font-sans pt-1">
                  <span>Klik di luar area teks untuk menyimpan perubahan otomatis.</span>
                  <span>{currentContent.split(/\s+/).filter(Boolean).length} kata</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
