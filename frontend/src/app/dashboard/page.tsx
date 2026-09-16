"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  HardDrive,
  CheckCircle,
  Warning,
  Clock,
  User,
  SignOut,
  Plus,
  ArrowsClockwise,
  CaretRight,
  CircleNotch,
} from "@phosphor-icons/react";
import { fetchCurrentUser, logout, ResearcherProfile, getGoogleLoginUrl } from "@/lib/api/auth";
import { DriveWarningModal } from "@/components/DriveWarningModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

/**
 * ponytail: Dashboard page for Telaah Journal Paper Workspace using Tailwind CSS, shadcn & Phosphor icons
 */
export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDriveWarning, setShowDriveWarning] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const user = await fetchCurrentUser();
      if (!user) {
        router.push("/");
        return;
      }
      setProfile(user);
      setLoading(false);

      if (!user.is_drive_granted) {
        setShowDriveWarning(true);
      }
    }
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push("/");
  };

  const handleReconnectDrive = () => {
    window.location.href = getGoogleLoginUrl("consent");
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400">
        <CircleNotch size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const sessionExpiry = profile.session_expires_at
    ? new Date(profile.session_expires_at).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "24 jam";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Workspace Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <FileText size={16} weight="bold" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">TELAAH</span>
              <span className="text-xs text-slate-400">Workspace Paper Jurnal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <User size={16} weight="bold" />
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200">{profile.full_name}</span>
                <span className="text-[11px] text-slate-400 font-mono">{profile.email}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs text-slate-300 border-slate-700 hover:text-red-400 hover:border-red-500/50"
            >
              <SignOut size={14} weight="bold" />
              <span>{isLoggingOut ? "Keluar..." : "Logout"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Surface */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full space-y-6">
        {/* Metrics & Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google Drive Connection Card */}
          <Card className="p-4 flex items-center justify-between border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  profile.is_drive_granted
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}
              >
                <HardDrive size={20} weight="duotone" />
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400 font-medium">Pustaka Literatur Google Drive</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">
                  {profile.is_drive_granted ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle size={14} weight="fill" /> Terhubung & Siap Sinkron
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-400">
                      <Warning size={14} weight="fill" /> Izin Akses Terbatas
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!profile.is_drive_granted && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReconnectDrive}
                className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              >
                Beri Izin Drive
              </Button>
            )}
          </Card>

          {/* 24h Session Expiry Card */}
          <Card className="p-4 flex items-center gap-3 border-slate-800 bg-slate-900/60 text-left">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock size={20} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Masa Aktif Sesi Terautentikasi</div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">
                Aktif hingga pukul {sessionExpiry} WIB
              </div>
            </div>
          </Card>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="text-left">
            <h2 className="text-xl font-bold tracking-tight text-white">Daftar Draf Paper Jurnal</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola manuskrip paper riset untuk publikasi jurnal internasional & nasional (Scopus/SINTA)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!profile.is_drive_granted) setShowDriveWarning(true);
              }}
              className="text-xs border-slate-700"
            >
              <ArrowsClockwise size={14} weight="bold" />
              <span>Sinkronkan Literatur</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (!profile.is_drive_granted) setShowDriveWarning(true);
              }}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={14} weight="bold" />
              <span>Tulis Paper Baru</span>
            </Button>
          </div>
        </div>

        {/* Paper Table List */}
        <Card className="border-slate-800 bg-slate-900/80 overflow-hidden text-left">
          <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-950/60 grid grid-cols-12 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <span className="col-span-6">Judul Manuskrip Paper</span>
            <span className="col-span-3">Target Jurnal</span>
            <span className="col-span-2">Pustaka Drive</span>
            <span className="col-span-1 text-right">Status</span>
          </div>

          {/* Sample Active Journal Paper Row */}
          <div className="px-5 py-4 border-b border-slate-800/60 grid grid-cols-12 items-center text-sm hover:bg-slate-800/30 transition-colors">
            <div className="col-span-6 pr-4">
              <div className="font-semibold text-slate-100 line-clamp-1">
                Multi-Aspect Semantic Synthesis for Academic Papers Using State-Space Hyena Architectures
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Dibuat 16 September 2026 · Terakhir disinkronkan hari ini
              </div>
            </div>

            <div className="col-span-3 text-xs text-slate-300">
              IEEE Transactions (Q1 Scopus)
            </div>

            <div className="col-span-2">
              <Badge variant="outline" className="text-xs gap-1 py-0.5">
                <HardDrive size={12} weight="fill" className="text-blue-400" />
                <span>18 Berkas PDF</span>
              </Badge>
            </div>

            <div className="col-span-1 flex items-center justify-end gap-1">
              <Badge variant="success" className="text-[11px]">
                Draf IMRaD
              </Badge>
              <CaretRight size={14} className="text-slate-500" />
            </div>
          </div>

          {/* Table Footer Summary */}
          <div className="px-5 py-3 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>Menampilkan 1 manuskrip paper aktif</span>
            <span className="font-mono text-slate-500">Penyimpanan vektor: PostgreSQL (pgvector)</span>
          </div>
        </Card>
      </main>

      {/* Drive Scope Warning Modal */}
      <DriveWarningModal
        isOpen={showDriveWarning}
        onClose={() => setShowDriveWarning(false)}
      />
    </div>
  );
}
