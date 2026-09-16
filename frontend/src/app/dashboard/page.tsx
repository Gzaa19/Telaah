"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { fetchCurrentUser, logout, ResearcherProfile, getGoogleLoginUrl } from "@/lib/api/auth";
import { DriveWarningModal } from "@/components/DriveWarningModal";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDriveWarning, setShowDriveWarning] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const data = await fetchCurrentUser();
      if (!data) {
        router.push("/");
      } else {
        setProfile(data);
        if (!data.is_drive_granted) {
          setShowDriveWarning(true);
        }
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      router.push("/");
    }
  };

  const handleReconnectDrive = () => {
    window.location.href = getGoogleLoginUrl("consent");
  };

  if (loading || !profile) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--accent-primary)" }} />
      </div>
    );
  }

  const sessionExpiry = new Date(profile.session_expires_at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Workspace Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border-dim)",
          backgroundColor: "var(--bg-surface)",
          padding: "0.75rem 0",
        }}
      >
        <div className="shell-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 28,
                height: 28,
                backgroundColor: "var(--accent-primary)",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <FileText size={16} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>TELAAH</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginLeft: "0.5rem" }}>
                Workspace Peneliti
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border-default)" }}
                />
              ) : (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={16} color="var(--text-secondary)" />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{profile.full_name}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{profile.email}</span>
              </div>
            </div>

            <button onClick={handleLogout} className="btn-base btn-ghost" style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}>
              <LogOut size={14} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Surface */}
      <main className="shell-container" style={{ flex: 1, padding: "2rem 1.5rem" }}>
        {/* Status Metrics Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {/* Drive Status Panel */}
          <div className="academic-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                  backgroundColor: profile.is_drive_granted ? "var(--emerald-bg)" : "var(--amber-bg)",
                  color: profile.is_drive_granted ? "var(--emerald-success)" : "var(--amber-warning)",
                  display: "flex",
                }}
              >
                <HardDrive size={20} />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Koneksi Google Drive</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, marginTop: 2 }}>
                  {profile.is_drive_granted ? (
                    <span style={{ color: "var(--emerald-success)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <CheckCircle2 size={13} /> Terhubung (Drive Readonly)
                    </span>
                  ) : (
                    <span style={{ color: "var(--amber-warning)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <AlertTriangle size={13} /> Otorisasi Belum Lengkap
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!profile.is_drive_granted && (
              <button
                onClick={handleReconnectDrive}
                className="btn-base btn-brand"
                style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem" }}
              >
                Izinkan Drive
              </button>
            )}
          </div>

          {/* Session Expiry Status Panel */}
          <div className="academic-card" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                padding: "0.5rem",
                borderRadius: "0.375rem",
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent-primary)",
                display: "flex",
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Masa Aktif Sesi 24 Jam</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, marginTop: 2 }}>
                Berlaku hingga pukul {sessionExpiry} WIB
              </div>
            </div>
          </div>
        </div>

        {/* Proposals Management Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 className="section-title">Daftar Usulan Proposal Penelitian</h2>
            <p className="meta-subtext">Kelola usulan hibah riset dan draf artikel jurnal terakreditasi</p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              className="btn-base btn-ghost"
              onClick={() => {
                if (!profile.is_drive_granted) setShowDriveWarning(true);
              }}
            >
              <RefreshCw size={14} />
              <span>Sinkronkan Dokumen Drive</span>
            </button>
            <button
              className="btn-base btn-brand"
              onClick={() => {
                if (!profile.is_drive_granted) setShowDriveWarning(true);
              }}
            >
              <Plus size={15} />
              <span>Buat Usulan Baru</span>
            </button>
          </div>
        </div>

        {/* Proposal Table / Academic List */}
        <div className="academic-card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "0.85rem 1.25rem",
              borderBottom: "1px solid var(--border-dim)",
              backgroundColor: "var(--bg-canvas)",
              display: "grid",
              gridTemplateColumns: "2.5fr 1.5fr 1fr 1fr 40px",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-tertiary)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <span>Judul Penelitian</span>
            <span>Skema Pendanaan</span>
            <span>Pustaka Drive</span>
            <span>Status Draf</span>
            <span></span>
          </div>

          {/* Sample Active Proposal Row */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--border-dim)",
              display: "grid",
              gridTemplateColumns: "2.5fr 1.5fr 1fr 1fr 40px",
              alignItems: "center",
              fontSize: "0.875rem",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                Analisis Sentimen Multi-Aspek pada Ulasan Akademik Menggunakan Arsitektur Hyena
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 2 }}>
                Dibuat 16 September 2026 · Terakhir diperbarui hari ini
              </div>
            </div>

            <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)" }}>
              Penelitian Dasar (BIMA 2026)
            </div>

            <div>
              <span className="status-pill neutral" style={{ fontSize: "0.75rem" }}>
                <HardDrive size={11} /> 14 Dokumen
              </span>
            </div>

            <div>
              <span className="status-pill success">Draf Siap Ekspor</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </div>
          </div>

          {/* Info Footer */}
          <div
            style={{
              padding: "0.85rem 1.25rem",
              backgroundColor: "var(--bg-canvas)",
              fontSize: "0.8rem",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Menampilkan 1 usulan penelitian aktif</span>
            <span>Penyimpanan vektor: PostgreSQL (pgvector)</span>
          </div>
        </div>
      </main>

      <DriveWarningModal
        isOpen={showDriveWarning}
        onClose={() => setShowDriveWarning(false)}
      />
    </div>
  );
}
