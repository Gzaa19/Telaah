"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Lock,
  Loader2,
} from "lucide-react";
import { fetchCurrentUser, getGoogleLoginUrl } from "@/lib/api/auth";

export default function LandingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function verifyExistingSession() {
      const user = await fetchCurrentUser();
      if (user) {
        router.push("/dashboard");
      } else {
        setCheckingAuth(false);
      }
    }
    verifyExistingSession();
  }, [router]);

  const handleLogin = () => {
    window.location.href = getGoogleLoginUrl("consent");
  };

  if (checkingAuth) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "var(--accent-primary)" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Institutional Top Navigation */}
      <nav
        style={{
          borderBottom: "1px solid var(--border-dim)",
          backgroundColor: "rgba(9, 13, 22, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "0.875rem 0",
        }}
      >
        <div className="shell-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 32,
                height: 32,
                backgroundColor: "var(--accent-primary)",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>TELAAH</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginLeft: "0.5rem", borderLeft: "1px solid var(--border-default)", paddingLeft: "0.5rem" }}>
                Penyusun Proposal & Paper Ilmiah
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span className="status-pill neutral">DRTPM · BIMA · IEEE Compatible</span>
            <button onClick={handleLogin} className="btn-base btn-google-auth" id="btn-login-header">
              <GoogleGLogo />
              <span>Masuk via Google</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Two-Column Academic Hero */}
      <main className="shell-container" style={{ flex: 1, padding: "4rem 1.5rem 3rem 1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: "3.5rem",
            alignItems: "center",
          }}
        >
          {/* Left Column: Context & Intent */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <span className="status-pill neutral">
                <Lock size={12} style={{ color: "var(--emerald-success)" }} />
                Otentikasi Aman Google OAuth 2.0
              </span>
              <span className="status-pill neutral">
                Ekstensi pgvector Aktif
              </span>
            </div>

            <h1 className="display-title" style={{ marginBottom: "1.25rem" }}>
              Otomasi Proposal Riset Akademis Tanpa Halusinasi Sitasi
            </h1>

            <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "2rem" }}>
              Platform kerja cerdas untuk akademisi dan peneliti. Tautkan repositori pustaka Google Drive Anda,
              ekstraksi dokumen secara otomatis menjadi representasi vektor presisi tinggi, dan hasilkan draf usulan
              penelitian yang patuh pada format panduan resmi institusi.
            </p>

            {/* Action Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2.5rem" }}>
              <button
                onClick={handleLogin}
                className="btn-base btn-google-auth"
                style={{ padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}
                id="btn-login-hero"
              >
                <GoogleGLogo />
                <span>Masuk dengan Akun Peneliti Google</span>
              </button>
            </div>

            {/* Institutional Compliance Checklist */}
            <div
              style={{
                borderTop: "1px solid var(--border-dim)",
                paddingTop: "1.5rem",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.85rem",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={16} color="var(--emerald-success)" />
                <span>Format Template BIMA Kemdikbudristek</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={16} color="var(--emerald-success)" />
                <span>Sitasi Tertelusuri ke Sumber Asli</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={16} color="var(--emerald-success)" />
                <span>Enkripsi Kredensial AES-256</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={16} color="var(--emerald-success)" />
                <span>Hak Cipta Dokumen 100% Milik Peneliti</span>
              </div>
            </div>
          </div>

          {/* Right Column: Concrete Structural Proposal Preview */}
          <div>
            <div className="preview-window">
              <div className="preview-header">
                <span>DRAFT_PROPOSAL_BIMA_2026.docx</span>
                <span className="status-pill success" style={{ fontSize: "0.7rem" }}>
                  <CheckCircle2 size={11} /> 12 Sumber Pustaka Terhubung
                </span>
              </div>
              <div className="preview-body">
                <div style={{ marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-tertiary)", fontWeight: 700 }}>
                    Skema: Penelitian Dasar Kompetitif Nasional
                  </span>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", marginTop: "0.25rem" }}>
                    Pengembangan Sistem Deteksi Citra Satelit Berbasis Spatio-Temporal Graph Neural Networks
                  </h3>
                </div>

                <div style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "0.85rem", marginBottom: "0.85rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-primary)", marginBottom: "0.35rem" }}>
                    1.2 TINJAUAN PUSTAKA & STATE OF THE ART
                  </div>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    ...pendekatan konvensional CNN masih terkendala resolusi temporal yang fluktuatif, sebagaimana
                    dibuktikan oleh evaluasi empiris model transformator spasial{" "}
                    <span className="citation-chip">
                      <HardDrive size={10} /> [Ref: Sutrisno_2024.pdf: hal. 4]
                    </span>
                    . Melalui vektorisasi semantik berbasis pgvector, kelemahan konvergensi bobot gradien dapat diminimalisir hingga 14.8%{" "}
                    <span className="citation-chip">
                      <HardDrive size={10} /> [Ref: Wang_et_al_IEEE.pdf]
                    </span>
                    ...
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-canvas)",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--border-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ShieldCheck size={16} color="var(--emerald-success)" />
                    <span style={{ color: "var(--text-secondary)" }}>Traceability Sitasi: 100% diverifikasi terhadap berkas PDF Google Drive</span>
                  </div>
                  <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>pgvector</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Technical Integrity Strip */}
      <footer
        style={{
          borderTop: "1px solid var(--border-dim)",
          backgroundColor: "var(--bg-surface)",
          padding: "1.25rem 0",
          fontSize: "0.8rem",
          color: "var(--text-tertiary)",
        }}
      >
        <div className="shell-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            TELAAH Research Assistant © 2026. Protokol Kepatuhan Akademis DRTPM & Konstitusi Paper Generator.
          </div>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            <span>FastAPI + PostgreSQL pgvector</span>
            <span>Next.js App Router (Bun Runtime)</span>
            <span>Google Identity Services</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function GoogleGLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}
