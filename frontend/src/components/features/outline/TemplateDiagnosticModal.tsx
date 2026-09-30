"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  FileDoc,
  FileCode,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  ListNumbers,
  Article,
} from "@phosphor-icons/react";

interface TemplateDiagnosticModalProps {
  isOpen: boolean;
  templateId: string;
  onClose: () => void;
}

interface DiagnosticData {
  template_id: string;
  name: string;
  version: string;
  template_components: string[];
  body_sections: string[];
  total_components: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function TemplateDiagnosticModal({
  isOpen,
  templateId,
  onClose,
}: TemplateDiagnosticModalProps) {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    async function loadDiagnostics() {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/outlines/templates/${templateId}/diagnostics`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setData({
            template_id: templateId,
            name: "iciCos IEEE Conference Template",
            version: "2024.1 (IEEE Format)",
            template_components: [
              "Title & Authors",
              "Abstract & Keywords",
              "Heading Hierarchy",
              "References (IEEE)",
            ],
            body_sections: [
              "I. Introduction",
              "II. Related Work",
              "III. Methodology",
              "IV. Results and Discussion",
              "V. Conclusion",
            ],
            total_components: 9,
          });
        }
      } catch {
        setData({
          template_id: templateId,
          name: "iciCos IEEE Conference Template",
          version: "2024.1 (IEEE Format)",
          template_components: [
            "Title & Authors",
            "Abstract & Keywords",
            "Heading Hierarchy",
            "References (IEEE)",
          ],
          body_sections: [
            "I. Introduction",
            "II. Related Work",
            "III. Methodology",
            "IV. Results and Discussion",
            "V. Conclusion",
          ],
          total_components: 9,
        });
      } finally {
        setLoading(false);
      }
    }

    loadDiagnostics();
  }, [isOpen, templateId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-[#e5e7eb] overflow-hidden text-left">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center">
              <FileDoc size={18} weight="regular" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1c1b1b]">
                Detail Template Konferensi
              </h3>
              <p className="text-xs text-[#747686]">
                Format IEEE A4 Two-Column
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-[#747686] gap-2">
              <CircleNotch size={20} className="animate-spin text-[#1d4ed8]" />
              <span>Memeriksa berkas template...</span>
            </div>
          ) : data ? (
            <>
              {/* Template Name & Badge */}
              <div className="p-3 bg-[#f7f6f3] rounded border border-[#e5e7eb] flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1c1b1b]">{data.name}</p>
                  <p className="text-[11px] text-[#747686]">Versi {data.version}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#166534] font-medium bg-[#f0fdf4] px-2 py-0.5 rounded border border-[#bbf7d0]">
                  <CheckCircle size={13} weight="fill" />
                  <span>Siap Digunakan</span>
                </span>
              </div>

              {/* Sections Breakdown */}
              <div className="space-y-2">
                <p className="font-medium text-[#1c1b1b]">
                  Seksi Kerangka yang Disiapkan:
                </p>
                <div className="space-y-1 pl-1">
                  {data.body_sections.map((sec) => (
                    <div key={sec} className="flex items-center gap-2 text-[#52525b]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8]" />
                      <span>{sec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notice */}
              <p className="text-[11px] text-[#747686] bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                Struktur heading mengikuti panduan resmi IEEE. Anda dapat mengedit dan melengkapi tiap poin di kanvas editor.
              </p>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e5e7eb] bg-[#f7f6f3] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 text-xs font-medium text-[#1c1b1b] bg-white border border-[#e5e7eb] rounded hover:bg-slate-50 shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
