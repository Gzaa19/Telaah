"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ShieldCheck, Database, FileText, ArrowRight, Loader2 } from "lucide-react";
import { fetchCurrentUser, getGoogleLoginUrl } from "@/lib/api/auth";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const user = await fetchCurrentUser();
      if (user) {
        router.push("/dashboard");
      } else {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogin = () => {
    window.location.href = getGoogleLoginUrl("consent");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Loader2 className="animate-spin" size={36} style={{ color: "#38bdf8" }} />
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <header
        style={{
          borderBottom: "1px solid var(--card-border)",
          padding: "1rem 0",
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                backgroundColor: "#2563eb",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                display: "flex",
              }}
            >
              <FileText size={22} color="#ffffff" />
            </div>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
              Paper Generator
            </span>
          </div>

          <button onClick={handleLogin} className="btn btn-google" id="login-button-header">
            <GoogleIcon />
            <span>Login dengan Google</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: "5rem 0 3rem 0", textAlign: "center", flex: 1 }}>
        <div className="container" style={{ maxWidth: "840px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              backgroundColor: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "#38bdf8",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            <ShieldCheck size={16} />
            <span>Terverifikasi dengan Google Identity & pgvector</span>
          </div>

          <h1
            style={{
              fontSize: "3.25rem",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              marginBottom: "1.5rem",
              background: "linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Penyusun Proposal Penelitian Ilmiah Otomatis & Presisi
          </h1>

          <p
            style={{
              fontSize: "1.15rem",
              color: "#94a3b8",
              lineHeight: 1.6,
              marginBottom: "2.5rem",
            }}
          >
            Tautkan dokumen riset dari Google Drive Anda, nikmati pencarian vektor berkecepatan tinggi,
            dan buat draf proposal berstandar akademis yang anti-halusinasi dengan sitasi tertelusuri.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={handleLogin}
              className="btn btn-google"
              style={{ padding: "0.875rem 1.75rem", fontSize: "1.05rem" }}
              id="login-button-hero"
            >
              <GoogleIcon />
              <span>Masuk dengan Akun Google</span>
              <ArrowRight size={18} style={{ marginLeft: "0.5rem" }} />
            </button>
          </div>

          {/* Features Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.5rem",
              marginTop: "4rem",
              textAlign: "left",
            }}
          >
            <div className="card">
              <BookOpen size={28} color="#38bdf8" style={{ marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Format Baku Akademis
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Mengikuti panduan penulisan proposal standar (misal template BIMA/iciCos) secara ketat.
              </p>
            </div>

            <div className="card">
              <Database size={28} color="#10b981" style={{ marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Integrasi pgvector
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Embedding dokumen referensi Anda disimpan di PostgreSQL untuk pencarian kesamaan semantik.
              </p>
            </div>

            <div className="card">
              <ShieldCheck size={28} color="#f59e0b" style={{ marginBottom: "1rem" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Aman & Terenkripsi
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Token OAuth Google disimpan dengan enkripsi Fernet/AES-256. Tidak ada data mentah yang bocor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--card-border)",
          padding: "1.5rem 0",
          textAlign: "center",
          color: "#64748b",
          fontSize: "0.85rem",
        }}
      >
        <div className="container">
          © 2026 Paper Generator. Dibuat dengan FastAPI, pgvector, dan Next.js.
        </div>
      </footer>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
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
