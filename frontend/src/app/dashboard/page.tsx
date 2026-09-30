"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  HardDrive,
  Plus,
  CaretRight,
  ArrowRight,
  Database,
  Article,
  Sparkle,
  FileText,
  ArrowUpRight,
  Books,
  FolderOpen,
  Clock,
  Lock,
  ShieldCheck,
  MagnifyingGlass,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { fetchCurrentUser, ResearcherProfile } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

interface DocumentItem {
  id: string;
  file_name: string;
  import_status: string;
  extracted_at: string | null;
}

/**
 * tasteskill: DashboardPage tightly-knit editorial academic canvas layout.
 * Gaps, flexbox, and paddings are compact and cohesive to eliminate unnecessary vertical sprawl.
 */
export default function DashboardPage() {
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const user = await fetchCurrentUser();
        if (user) {
          setProfile(user);
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents`,
          { credentials: "include" }
        );
        if (res.ok) {
          const docs = await res.json();
          setDocuments(Array.isArray(docs) ? docs : []);
        }
      } catch {
        // Non-blocking
      }
    }
    loadData();
  }, []);

  const totalDocs = documents.length > 0 ? documents.length : 1;

  return (
    <WorkspaceLayout>
      <main className="flex-1 max-w-6xl mx-auto px-6 py-4.5 w-full space-y-4 bg-[#fcf9f8] text-left">
        {/* Welcome Header with Pill & Direct Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div className="space-y-1">
            {/* Pill badge matching reference */}
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#dce1ff] text-[#0037b0] text-[10.5px] font-sans font-medium">
              <Sparkle size={11} weight="fill" className="text-[#0037b0]" />
              <span>Workspace Paper Ilmiah</span>
            </div>

            <h1 className="font-serif text-2xl md:text-[28px] font-bold tracking-tight text-[#1c1b1b] leading-tight">
              Selamat datang, {profile?.full_name || "Gaza Al Ghozali Chansa"}
            </h1>

            <p className="text-xs text-[#434655] font-sans leading-relaxed max-w-xl">
              Kelola literatur riset dari Google Drive, telusuri pustaka ilmiah, dan susun kerangka serta draf paper berstandar publikasi.
            </p>
          </div>

          {/* Action buttons directly beside welcome */}
          <div className="flex items-center gap-2 shrink-0 pb-0.5">
            <Link href="/library">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] gap-1.5 h-8 px-3 shadow-2xs rounded-md font-sans"
              >
                <Books size={13} weight="regular" />
                <span>Pustaka Literatur</span>
              </Button>
            </Link>
            <Link href="/library/drive-browser">
              <Button
                size="sm"
                className="text-xs bg-[#0037b0] hover:bg-[#1d4ed8] text-white gap-1.5 shadow-2xs h-8 px-3 cursor-pointer rounded-md font-sans"
              >
                <Plus size={12} weight="bold" />
                <span>Impor dari Google Drive</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Summary Cards Row - Tight & Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Google Drive Literatur */}
          <Card className="p-3.5 flex flex-col justify-between border-[#e5e7eb] bg-white text-left hover:border-[#c4c5d7] transition-all shadow-2xs rounded-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1c1b1b] font-sans">
                  Google Drive Riset
                </span>
                <div className="p-1.5 rounded-md bg-[#82f5c1]/30 text-[#006c4a]">
                  <FolderOpen size={15} weight="regular" />
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#006c4a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span>
                <span>Terhubung & Siap</span>
              </div>

              <p className="text-[11.5px] text-[#434655] leading-relaxed mt-1.5 font-sans">
                Penyimpanan tersinkronisasi otomatis dengan folder riset di Google Drive Anda.
              </p>
            </div>

            <div className="pt-3">
              <Link
                href="/library/drive-browser"
                className="text-xs font-medium text-[#0037b0] hover:text-[#1d4ed8] flex items-center gap-1 hover:underline font-sans"
              >
                <span>Buka Berkas Google Drive</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          </Card>

          {/* Card 2: Pustaka & Pengindeksan */}
          <Card className="p-3.5 flex flex-col justify-between border-[#e5e7eb] bg-white text-left hover:border-[#c4c5d7] transition-all shadow-2xs rounded-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1c1b1b] font-sans">
                  Pustaka Terindeks
                </span>
                <div className="p-1.5 rounded-md bg-[#dce1ff] text-[#0037b0]">
                  <Database size={15} weight="regular" />
                </div>
              </div>

              <div className="mt-2 flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-serif text-2xl md:text-3xl font-bold text-[#1c1b1b] leading-none">
                    {totalDocs}
                  </span>
                  <span className="font-serif text-base font-bold text-[#1c1b1b] mt-0.5 leading-tight">
                    Dokumen
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[9px] text-[#006c4a] uppercase tracking-wider block font-semibold">
                    TERVERIFIKASI
                  </span>
                  <span className="font-mono text-[9px] text-[#747686] uppercase tracking-wider block font-medium">
                    SIAP DIRUJUK
                  </span>
                </div>
              </div>

              {/* Blue progress bar matching mockup */}
              <div className="h-[2px] bg-[#0037b0] rounded-full w-full my-2"></div>

              <p className="text-[11.5px] text-[#434655] leading-relaxed font-sans">
                Dokumen telah dianalisis dan siap dijadikan sitasi dan rujukan outline.
              </p>
            </div>

            <div className="pt-3">
              <Link
                href="/library"
                className="text-xs font-medium text-[#0037b0] hover:text-[#1d4ed8] flex items-center gap-1 hover:underline font-sans"
              >
                <span>Lihat Pustaka Literatur</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          </Card>

          {/* Card 3: Masa Aktif Sesi Peneliti */}
          <Card className="p-3.5 flex flex-col justify-between border-[#e5e7eb] bg-white text-left hover:border-[#c4c5d7] transition-all shadow-2xs rounded-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1c1b1b] font-sans">
                  Masa Aktif Sesi Peneliti
                </span>
                <div className="p-1.5 rounded-md bg-[#dce1ff] text-[#0037b0]">
                  <Clock size={15} weight="regular" />
                </div>
              </div>

              <div className="mt-1.5">
                <div className="font-mono text-[9px] text-[#747686] uppercase tracking-wider font-semibold">
                  BATAS WAKTU AKSES
                </div>
                <div className="font-serif text-xl font-bold text-[#1c1b1b] mt-0.5 leading-tight">
                  Hingga pukul 20.18
                  <br />
                  WIB
                </div>
              </div>

              <p className="text-[11.5px] text-[#434655] leading-relaxed mt-1.5 font-sans">
                Sesi login aktif untuk menjaga keamanan data riset Anda.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#747686] flex items-center gap-1">
                <Lock size={11} weight="bold" />
                <span>Sesi Terenkripsi</span>
              </span>
              <span className="bg-[#82f5c1] text-[#005137] px-1.5 py-0.2 rounded text-[9.5px] font-semibold font-sans">
                Aktif
              </span>
            </div>
          </Card>
        </div>

        {/* Section: Daftar Draf Paper Jurnal - Tight & Compact */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl font-bold tracking-tight text-[#1c1b1b]">
                Daftar Draf Paper Jurnal
              </h2>
              <p className="text-xs text-[#434655] font-sans">
                Kelola manuskrip paper riset untuk target publikasi jurnal internasional & nasional (Scopus/SINTA).
              </p>
            </div>

            {/* Search and Filter Inputs */}
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#747686]" />
                <input
                  type="text"
                  placeholder="Cari draf judul, DOI, tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7.5 pr-2.5 py-1 text-xs bg-white border border-[#e5e7eb] rounded-md text-[#1c1b1b] placeholder:text-[#747686] focus:outline-none focus:border-[#0037b0] shadow-2xs font-sans"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7.5 px-2.5 text-xs border-[#e5e7eb] bg-white hover:bg-[#f7f6f3] text-[#1c1b1b] gap-1 shadow-2xs rounded-md font-sans"
              >
                <SlidersHorizontal size={12} weight="bold" />
                <span>Filter</span>
              </Button>
            </div>
          </div>

          {/* Table Card */}
          <Card className="border-[#e5e7eb] bg-white overflow-hidden shadow-2xs rounded-lg">
            {/* Header Columns */}
            <div className="px-4 py-2 border-b border-[#e5e7eb] bg-[#f6f3f2] grid grid-cols-12 text-[9.5px] font-mono font-semibold text-[#747686] uppercase tracking-wider">
              <span className="col-span-6">JUDUL MANUSKRIP PAPER</span>
              <span className="col-span-3">TARGET JURNAL</span>
              <span className="col-span-2">PUSTAKA DRIVE</span>
              <span className="col-span-1 text-right">STATUS</span>
            </div>

            {/* Paper Row */}
            <div className="px-4 py-3 border-b border-[#f0eded] grid grid-cols-12 items-center hover:bg-[#faf9f7] transition-colors gap-3">
              {/* Column 1: Title and sync info */}
              <div className="col-span-6 flex items-start gap-2.5">
                <div className="p-1.5 rounded bg-[#dce1ff]/50 text-[#0037b0] mt-0.5 shrink-0">
                  <FileText size={16} weight="regular" />
                </div>
                <div className="min-w-0 pr-2">
                  <Link
                    href="/workspace/paper"
                    className="font-serif text-[14px] font-bold text-[#1c1b1b] hover:text-[#0037b0] transition-colors line-clamp-1 leading-snug"
                  >
                    Multi-Aspect Semantic Synthesis for Academic Papers Using State-Space Hyena Architectures
                  </Link>
                  <div className="font-mono text-[10.5px] text-[#747686] mt-0.5 flex items-center gap-1.5">
                    <span>Dibuat 16 September 2026</span>
                    <span>·</span>
                    <span className="text-[#006c4a] font-medium">Terakhir disinkronkan hari ini</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Target Jurnal Badge & Meta */}
              <div className="col-span-3">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#dce1ff] text-[#001551] border border-[#b7c4ff] text-[11px] font-semibold">
                  <ShieldCheck size={13} weight="bold" className="text-[#0037b0]" />
                  <span>IEEE Transactions (Q1 Scopus)</span>
                </div>
                <div className="font-mono text-[10px] text-[#747686] mt-0.5">
                  Impact Factor: 8.4 · CiteScore: 14.2
                </div>
              </div>

              {/* Column 3: Pustaka Drive */}
              <div className="col-span-2">
                <Link href="/library">
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#eae7e7] border border-[#dcd9d9] text-[#1c1b1b] text-[11px] font-sans font-medium hover:bg-[#dcd9d9] transition-colors cursor-pointer">
                    <FolderOpen size={12} weight="bold" className="text-[#434655]" />
                    <span>{totalDocs} Dokumen Terkait</span>
                  </div>
                </Link>
              </div>

              {/* Column 4: Status CTA Button */}
              <div className="col-span-1 flex items-center justify-end">
                <Link href="/workspace/paper">
                  <button
                    type="button"
                    className="bg-[#82f5c1] hover:bg-[#68dba9] text-[#005137] px-2.5 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer font-sans shadow-2xs"
                  >
                    <span>Draf IMRaD</span>
                    <CaretRight size={10} weight="bold" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Table Footer */}
            <div className="px-4 py-2 bg-white flex items-center justify-between text-xs">
              <span className="font-mono text-[10.5px] text-[#747686] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0037b0]"></span>
                <span>Menampilkan 1 manuskrip paper aktif</span>
              </span>
              <Link
                href="/library"
                className="text-xs font-medium text-[#0037b0] hover:underline flex items-center gap-1 font-sans"
              >
                <span>Buka Pustaka Literatur</span>
                <ArrowUpRight size={12} weight="bold" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Bottom Grid: 2 Cards - Tight & Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* Left: Struktur IMRaD & Progres Penulisan (col-span-8) */}
          <Card className="lg:col-span-8 p-4 border-[#e5e7eb] bg-white flex flex-col justify-between shadow-2xs rounded-lg">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#f0eded]">
                <div className="flex items-center gap-2">
                  <div className="text-[#0037b0]">
                    <Article size={16} weight="bold" />
                  </div>
                  <h3 className="font-serif text-base font-bold text-[#1c1b1b]">
                    Struktur IMRaD & Progres Penulisan
                  </h3>
                </div>
                <span className="font-mono text-[9.5px] text-[#747686] bg-[#f0eded] px-2 py-0.5 rounded">
                  Target Selesai: 4 Oktober 2026
                </span>
              </div>

              {/* 4 Steps Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5">
                {/* 1. Introduction */}
                <div className="p-2.5 rounded bg-[#f7f6f3] border border-[#e5e7eb] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#1c1b1b] text-[11px]">1. Introduction</span>
                    <span className="font-mono text-[10px] font-bold text-[#006c4a]">100%</span>
                  </div>
                  <div className="h-1 bg-[#006c4a] rounded-full w-full"></div>
                  <p className="text-[9.5px] font-mono text-[#434655] leading-snug">
                    5 Sitasi Utama
                    <br />
                    Terverifikasi
                  </p>
                </div>

                {/* 2. Methods */}
                <div className="p-2.5 rounded bg-[#f7f6f3] border border-[#e5e7eb] space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#1c1b1b] text-[11px]">2. Methods</span>
                    <span className="font-mono text-[10px] font-bold text-[#0037b0]">85%</span>
                  </div>
                  <div className="h-1 bg-[#0037b0] rounded-full w-full"></div>
                  <p className="text-[9.5px] font-mono text-[#434655] leading-snug">
                    Metodologi Riset
                    <br />
                    Tervalidasi
                  </p>
                </div>

                {/* 3. Results */}
                <div className="p-2.5 rounded bg-[#f7f6f3] border border-[#e5e7eb] space-y-1 opacity-80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-[#1c1b1b] text-[11px]">3. Results</span>
                    <span className="font-mono text-[10px] text-[#747686]">40%</span>
                  </div>
                  <div className="h-1 bg-[#dcd9d9] rounded-full w-full"></div>
                  <p className="text-[9.5px] font-mono text-[#747686] leading-snug">
                    Hasil Analisis
                    <br />
                    Eksperimen
                  </p>
                </div>

                {/* 4. Discussion */}
                <div className="p-2.5 rounded bg-[#f7f6f3] border border-[#e5e7eb] space-y-1 opacity-80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-medium text-[#1c1b1b] text-[11px]">4. Discussion</span>
                    <span className="font-mono text-[10px] text-[#747686]">20%</span>
                  </div>
                  <div className="h-1 bg-[#dcd9d9] rounded-full w-full"></div>
                  <p className="text-[9.5px] font-mono text-[#747686] leading-snug">
                    Pembahasan &
                    <br />
                    Kesimpulan
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Right: Validasi Orisinalitas (col-span-4) */}
          <Card className="lg:col-span-4 p-4 border-[#e5e7eb] bg-white flex flex-col justify-between shadow-2xs rounded-lg text-left">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1c1b1b] font-sans">
                <ShieldCheck size={15} weight="fill" className="text-[#006c4a]" />
                <span>Validasi Orisinalitas Paper</span>
              </div>

              <p className="text-xs text-[#434655] font-sans leading-relaxed mt-1.5">
                Tingkat orisinalitas manuskrip terhadap pustaka literatur ilmiah:
              </p>

              <div className="mt-3 flex items-center">
                <span className="font-serif text-3xl font-bold text-[#006c4a]">
                  94.8%
                </span>
                <div className="font-mono text-[10px] text-[#747686] ml-2 flex flex-col leading-tight">
                  <span>Similarity</span>
                  <span>Aman</span>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <Link
                href="/workspace/paper"
                className="text-xs font-medium text-[#0037b0] hover:text-[#1d4ed8] flex items-center gap-1 hover:underline font-sans"
              >
                <span>Buka Draf Manuskrip</span>
                <ArrowUpRight size={12} weight="bold" />
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </WorkspaceLayout>
  );
}
