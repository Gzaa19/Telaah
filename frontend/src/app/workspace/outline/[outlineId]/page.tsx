"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CircleNotch,
  CheckCircle,
  WarningCircle,
  Sparkle,
  ArrowRight,
  ShieldCheck,
  ArrowCounterClockwise,
  Clock,
  Article,
  X,
  Lock,
} from "@phosphor-icons/react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTreeNav } from "@/components/features/outline/SectionTreeNav";
import { SectionFieldEditor } from "@/components/features/outline/SectionFieldEditor";
import { ProvenanceDrawer } from "@/components/features/outline/ProvenanceDrawer";
import { OutlineCanvasSkeleton } from "@/components/features/skeletons/OutlineCanvasSkeleton";
import {
  fetchOutlineDetail,
  updateSectionField,
  regenerateSection,
  regenerateOutline,
  approveOutline,
  fetchOutlineVersions,
} from "@/lib/api/outlines";
import {
  OutlineDetailResponse,
  SectionDTO,
  FieldDTO,
  OutlineVersionItem,
} from "@/types/outlines";

interface PageProps {
  params: Promise<{ outlineId: string }>;
}

export default function OutlineCanvasPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const outlineId = resolvedParams.outlineId;

  // Outline data states
  const [outline, setOutline] = useState<OutlineDetailResponse | null>(null);
  const [versions, setVersions] = useState<OutlineVersionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active selections
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [activeField, setActiveField] = useState<FieldDTO | null>(null);

  // Operation states
  const [isRegeneratingSection, setIsRegeneratingSection] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState<boolean>(false);
  const [regenConfirmOpen, setRegenConfirmOpen] = useState<boolean>(false);
  const [resetAllSections, setResetAllSections] = useState<boolean>(false);
  const [isRegeneratingFull, setIsRegeneratingFull] = useState<boolean>(false);

  // Load outline details on mount with polling support if generation is ongoing
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    async function loadData() {
      try {
        setError(null);
        const [detailData, versionData] = await Promise.all([
          fetchOutlineDetail(outlineId),
          fetchOutlineVersions(outlineId).catch(() => ({ versions: [] })),
        ]);

        setOutline(detailData);
        setVersions(versionData.versions || []);

        if (detailData.sections && detailData.sections.length > 0) {
          setActiveSectionId((prev) => prev || detailData.sections[0].section_id);
          setActiveField((prev) => {
            if (prev) return prev;
            return detailData.sections[0].fields[0] || null;
          });
        }

        // If outline is actively synthesizing, poll until ready
        if (
          detailData.generation_status === "generating" ||
          detailData.generation_status === "preparing"
        ) {
          if (!pollInterval) {
            pollInterval = setInterval(async () => {
              try {
                const fresh = await fetchOutlineDetail(outlineId);
                setOutline(fresh);
                if (
                  fresh.generation_status === "ready" ||
                  fresh.generation_status === "failed"
                ) {
                  if (pollInterval) clearInterval(pollInterval);
                  if (fresh.sections && fresh.sections.length > 0) {
                    setActiveSectionId(fresh.sections[0].section_id);
                    setActiveField(fresh.sections[0].fields[0] || null);
                  }
                }
              } catch (e) {
                console.error("Poll update error:", e);
              }
            }, 2500);
          }
        }
      } catch (err: any) {
        console.error("Failed to load outline canvas:", err);
        setError(err.message || "Gagal memuat kerangka outline.");
      } finally {
        setLoading(false);
      }
    }

    if (outlineId) {
      loadData();
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [outlineId]);

  const activeSection = outline?.sections.find((s) => s.section_id === activeSectionId) || null;

  // Handle active section change
  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const sec = outline?.sections.find((s) => s.section_id === sectionId);
    if (sec && sec.fields.length > 0) {
      setActiveField(sec.fields[0]);
    } else {
      setActiveField(null);
    }
  };

  // Handle field save (auto-save on blur)
  const handleSaveField = async (fieldId: string, content: string) => {
    if (!outline) return;

    try {
      const res = await updateSectionField(outline.outline_id, fieldId, { content });

      // Update local state
      setOutline((prev) => {
        if (!prev) return prev;
        const newSections = prev.sections.map((sec) => {
          const hasField = sec.fields.some((f) => f.field_id === fieldId);
          if (!hasField) return sec;

          const newFields = sec.fields.map((f) =>
            f.field_id === fieldId
              ? {
                  ...f,
                  content: res.content,
                  is_edited: res.is_edited,
                  is_needs_input: res.is_needs_input,
                }
              : f
          );

          return {
            ...sec,
            section_status: res.is_edited ? ("edited" as const) : sec.section_status,
            fields: newFields,
          };
        });

        return { ...prev, sections: newSections };
      });

      // Update active field if matching
      if (activeField?.field_id === fieldId) {
        setActiveField((prev: FieldDTO | null) =>
          prev
            ? {
                ...prev,
                content: res.content,
                is_edited: res.is_edited,
                is_needs_input: res.is_needs_input,
              }
            : null
        );
      }
    } catch (err: any) {
      // If outline was approved and forked
      if (err.message && err.message.includes("approved")) {
        alert("Kerangka ini telah disetujui sebelumnya. Silakan gunakan versi draf baru.");
      }
      throw err;
    }
  };

  // Handle single section regeneration
  const handleRegenerateSection = async (sectionId: string) => {
    if (!outline) return;

    try {
      setIsRegeneratingSection(true);
      await regenerateSection(outline.outline_id, sectionId);

      // Reload fresh outline details
      const fresh = await fetchOutlineDetail(outline.outline_id);
      setOutline(fresh);

      const sec = fresh.sections.find((s) => s.section_id === sectionId);
      if (sec && sec.fields.length > 0) {
        setActiveField(sec.fields[0]);
      }
    } catch (err: any) {
      console.error("Section regeneration failed:", err);
      alert(err.message || "Gagal menyusun ulang bagian ini.");
    } finally {
      setIsRegeneratingSection(false);
    }
  };

  // Handle full outline regeneration
  const handleConfirmRegenerateFull = async () => {
    if (!outline) return;

    try {
      setIsRegeneratingFull(true);
      const res = await regenerateOutline(outline.outline_id, {
        reset_all_sections: resetAllSections,
      });

      setRegenConfirmOpen(false);
      // Redirect to outline generator setup or new outline canvas
      router.push(`/workspace/outline/${res.outline_id}`);
    } catch (err: any) {
      console.error("Outline regeneration failed:", err);
      alert(err.message || "Gagal meregenerasi outline.");
    } finally {
      setIsRegeneratingFull(false);
    }
  };

  // Handle outline approval
  const handleConfirmApprove = async () => {
    if (!outline) return;

    try {
      setIsApproving(true);
      const res = await approveOutline(outline.outline_id);

      setOutline((prev) =>
        prev
          ? {
              ...prev,
              approval_status: res.approval_status,
              approved_at: res.approved_at,
            }
          : null
      );

      setApproveConfirmOpen(false);
    } catch (err: any) {
      console.error("Outline approval failed:", err);
      alert(err.message || "Gagal menyetujui outline.");
    } finally {
      setIsApproving(false);
    }
  };

  const totalNeedsInput =
    outline?.sections.reduce(
      (acc, sec) => acc + sec.fields.filter((f) => f.is_needs_input).length,
      0
    ) || 0;

  const isApproved = outline?.approval_status === "approved";

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#fcf9f8] text-[#747686] font-sans">
          <CircleNotch size={32} className="animate-spin text-[#0037b0] mb-3" />
          <p className="text-sm font-semibold text-[#1c1b1b]">Memuat Canvas Editorial Kerangka...</p>
          <p className="text-xs text-[#747686] mt-1">Mengambil struktur sections dan chunk sitasi rujukan.</p>
        </div>
      </WorkspaceLayout>
    );
  }

  if (error || !outline) {
    return (
      <WorkspaceLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#fcf9f8] text-[#747686] font-sans text-center">
          <WarningCircle size={36} weight="fill" className="text-rose-500 mb-3" />
          <p className="text-sm font-semibold text-[#1c1b1b]">Gagal Membuka Kerangka Outline</p>
          <p className="text-xs text-[#747686] max-w-md mt-1 mb-4">{error || "Data kerangka tidak ditemukan."}</p>
          <Link href="/workspace/outline">
            <Button size="sm" variant="outline" className="text-xs font-sans">
              Kembali ke Outline Generator
            </Button>
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="flex-1 flex flex-col h-[calc(100vh-44px)] overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] text-left">
        {/* Top Control Bar */}
        <header className="h-12 border-b border-[#e5e7eb] bg-white px-5 flex items-center justify-between shrink-0 z-10">
          {/* Left info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/workspace/outline"
              className="text-[#747686] hover:text-[#1c1b1b] p-1 rounded transition-colors"
              title="Kembali ke Setup"
            >
              <ArrowLeft size={16} />
            </Link>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-sans font-semibold text-sm text-[#1c1b1b] truncate max-w-sm">
                Kerangka Naskah ({outline.template_id.toUpperCase()})
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-sans font-medium shrink-0 ${
                  isApproved
                    ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]"
                    : "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]"
                }`}
              >
                {isApproved ? "Disetujui (Approved)" : `v${outline.version_number} (Draft)`}
              </Badge>
              {totalNeedsInput > 0 && !isApproved && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-sans font-medium border-amber-200 bg-amber-50 text-amber-700 shrink-0"
                >
                  {totalNeedsInput} Perlu Input
                </Badge>
              )}
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Regenerate Version Button */}
            {!isApproved && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRegenConfirmOpen(true)}
                className="h-7.5 px-2.5 text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#434655] gap-1.5 rounded shadow-2xs font-sans cursor-pointer"
              >
                <ArrowCounterClockwise size={13} />
                <span className="hidden sm:inline">Regenerasi (v{outline.version_number + 1})</span>
              </Button>
            )}

            {/* Approve Button */}
            {!isApproved ? (
              <Button
                size="sm"
                onClick={() => setApproveConfirmOpen(true)}
                className="h-7.5 px-3 text-xs bg-[#006c4a] hover:bg-[#005137] text-white gap-1.5 rounded shadow-2xs font-sans font-medium cursor-pointer"
              >
                <CheckCircle size={13} weight="fill" />
                <span>Setujui Kerangka</span>
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-[#006c4a] font-medium font-sans px-2.5 py-1 rounded bg-[#ecfdf5] border border-[#a7f3d0]">
                <Lock size={13} weight="fill" />
                <span>Terkunci & Disetujui</span>
              </span>
            )}

            {/* Advance to Paper Workspace */}
            <Link href="/workspace/paper">
              <Button
                size="sm"
                className="h-7.5 px-3 text-xs bg-[#0037b0] hover:bg-[#1d4ed8] text-white gap-1.5 rounded shadow-2xs font-sans font-medium cursor-pointer"
              >
                <span>Mulai Tulis Paper</span>
                <ArrowRight size={13} weight="bold" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Live Synthesis Banner */}
        {(outline.generation_status === "generating" || outline.generation_status === "preparing") && (
          <div className="bg-[#eff6ff] border-b border-[#bfdbfe] px-5 py-2 flex items-center justify-between text-xs text-[#1d4ed8] font-sans">
            <div className="flex items-center gap-2">
              <CircleNotch size={14} className="animate-spin text-[#0037b0]" />
              <span>Sistem sedang menyusun kerangka naskah secara otomatis berdasarkan dokumen pustaka...</span>
            </div>
            <span className="text-[11px] font-medium bg-white/70 px-2 py-0.5 rounded border border-[#bfdbfe]">
              Memproses Real-Time
            </span>
          </div>
        )}

        {/* 3-Panel Editorial Studio Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Panel 1 (Left): Section Tree Navigation */}
          <SectionTreeNav
            sections={outline.sections}
            activeSectionId={activeSectionId}
            onSelectSection={handleSelectSection}
          />

          {/* Panel 2 (Center): Active Section Field Editor */}
          {activeSection ? (
            <SectionFieldEditor
              section={activeSection}
              activeFieldId={activeField?.field_id || null}
              onSelectField={(field) => setActiveField(field)}
              onSaveField={handleSaveField}
              onRegenerateSection={handleRegenerateSection}
              isRegeneratingSection={isRegeneratingSection}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-xs text-[#747686] font-sans">
              Pilih salah satu bagian dari navigasi sebelah kiri.
            </div>
          )}

          {/* Panel 3 (Right): Literature Provenance Drawer */}
          <ProvenanceDrawer
            activeField={activeField}
            sectionTitle={activeSection?.title}
          />
        </div>

        {/* Modal: Confirm Approval */}
        {approveConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white border border-[#e5e7eb] rounded-lg shadow-2xl p-6 space-y-4 text-left font-sans">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-base font-semibold text-[#1c1b1b]">
                  <CheckCircle size={20} weight="fill" className="text-[#006c4a]" />
                  <span>Setujui Kerangka Outline?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setApproveConfirmOpen(false)}
                  className="text-[#747686] hover:text-[#1c1b1b] p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              {totalNeedsInput > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <WarningCircle size={14} weight="fill" /> Perhatian: Masih ada {totalNeedsInput} butir [NEEDS INPUT]
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Anda tetap dapat menyetujui kerangka ini. Butir yang belum lengkap dapat Anda lengkapi nanti di workspace penulisan paper.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#434655] leading-relaxed">
                  Setelah disetujui, kerangka versi {outline.version_number} akan ditandai final sebagai acuan draf penulisan manuskrip ilmiah.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApproveConfirmOpen(false)}
                  className="text-xs font-sans"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmApprove}
                  disabled={isApproving}
                  className="text-xs bg-[#006c4a] hover:bg-[#005137] text-white font-sans font-medium gap-1.5"
                >
                  {isApproving ? (
                    <>
                      <CircleNotch size={14} className="animate-spin" />
                      <span>Menyetujui...</span>
                    </>
                  ) : (
                    <span>Ya, Setujui Kerangka</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirm Full Regeneration */}
        {regenConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white border border-[#e5e7eb] rounded-lg shadow-2xl p-6 space-y-4 text-left font-sans">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-base font-semibold text-[#1c1b1b]">
                  <ArrowCounterClockwise size={20} className="text-[#0037b0]" />
                  <span>Regenerasi Kerangka Baru (v{outline.version_number + 1})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRegenConfirmOpen(false)}
                  className="text-[#747686] hover:text-[#1c1b1b] p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-[#434655] leading-relaxed">
                Sistem akan membuat versi kerangka baru (v{outline.version_number + 1}) dengan menyintesis ulang poin-poin dari dokumen rujukan Anda.
              </p>

              <div className="p-3 bg-[#f7f6f3] border border-[#e5e7eb] rounded space-y-2 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetAllSections}
                    onChange={(e) => setResetAllSections(e.target.checked)}
                    className="mt-0.5 rounded text-[#0037b0] focus:ring-[#0037b0]"
                  />
                  <div>
                    <span className="font-semibold text-[#1c1b1b] block">Reset Seluruh Bagian</span>
                    <span className="text-[11px] text-[#747686] block">
                      Jika dicentang, hasil suntingan manual pada versi saat ini tidak akan disalin ke versi baru.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRegenConfirmOpen(false)}
                  className="text-xs font-sans"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmRegenerateFull}
                  disabled={isRegeneratingFull}
                  className="text-xs bg-[#0037b0] hover:bg-[#1d4ed8] text-white font-sans font-medium gap-1.5"
                >
                  {isRegeneratingFull ? (
                    <>
                      <CircleNotch size={14} className="animate-spin" />
                      <span>Memproses Versi Baru...</span>
                    </>
                  ) : (
                    <span>Mulai Regenerasi</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
