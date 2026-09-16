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
  PlusCircle,
  FolderSync,
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "1rem",
        }}
      >
        <Loader2 className="animate-spin" size={40} style={{ color: "#38bdf8" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>Memuat sesi peneliti...</p>
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
          borderBottom: "1px solid var(--card-border)",
          backgroundColor: "#1e293b",
          padding: "0.875rem 0",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                backgroundColor: "#2563eb",
                padding: "0.45rem",
                borderRadius: "0.5rem",
                display: "flex",
              }}
            >
              <FileText size={20} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.2 }}>
                Paper Generator
              </h1>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Workspace Peneliti
              </span>
            </div>
          </div>

          {/* User Profile Bar & Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "2px solid #3b82f6",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    backgroundColor: "#334155",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={20} color="#94a3b8" />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {profile.full_name}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {profile.email}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{ padding: "0.5rem 0.875rem", fontSize: "0.85rem" }}
              id="logout-button"
            >
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "2.5rem 0" }}>
        <div className="container">
          {/* Status Banners */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            {/* Drive Connection Status */}
            <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    backgroundColor: profile.is_drive_granted ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    color: profile.is_drive_granted ? "#10b981" : "#f59e0b",
                  }}
                >
                  <HardDrive size={24} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Status Google Drive</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.15rem" }}>
                    {profile.is_drive_granted ? (
                      <span style={{ color: "#34d399", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <CheckCircle2 size={16} /> Terhubung (Drive Readonly)
                      </span>
                    ) : (
                      <span style={{ color: "#fbbf24", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                        <AlertTriangle size={16} /> Akses Belum Diizinkan
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!profile.is_drive_granted && (
                <button
                  onClick={handleReconnectDrive}
                  className="btn btn-primary"
                  style={{ fontSize: "0.85rem", padding: "0.5rem 0.85rem", backgroundColor: "#d97706" }}
                >
                  Izinkan Drive
                </button>
              )}
            </div>

            {/* Session Expiry Status */}
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  color: "#38bdf8",
                }}
              >
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Masa Aktif Sesi</div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.15rem" }}>
                  Aktif hingga {sessionExpiry} WIB
                </div>
                <span className="badge badge-success" style={{ marginTop: "0.35rem" }}>
                  Sesi 24 Jam Terverifikasi
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Workspace Sections */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Draf Proposal Riset</h2>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  if (!profile.is_drive_granted) setShowDriveWarning(true);
                }}
              >
                <FolderSync size={16} />
                <span>Sinkronkan Drive</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!profile.is_drive_granted) setShowDriveWarning(true);
                }}
              >
                <PlusCircle size={16} />
                <span>Buat Proposal Baru</span>
              </button>
            </div>
          </div>

          {/* Empty State / Workspace Placeholder */}
          <div
            className="card"
            style={{
              padding: "4rem 2rem",
              textAlign: "center",
              border: "1px dashed var(--card-border)",
            }}
          >
            <FileText size={48} color="#64748b" style={{ margin: "0 auto 1rem auto" }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Belum Ada Draf Proposal Aktif
            </h3>
            <p style={{ color: "#94a3b8", maxWidth: "480px", margin: "0 auto 1.5rem auto", fontSize: "0.95rem" }}>
              Mulai dengan mengimpor berkas literatur dari Google Drive Anda atau buat draf proposal baru menggunakan skema penelitian yang tersedia.
            </p>
          </div>
        </div>
      </main>

      {/* Drive Scope Warning Modal */}
      <DriveWarningModal
        isOpen={showDriveWarning}
        onClose={() => setShowDriveWarning(false)}
      />
    </div>
  );
}
