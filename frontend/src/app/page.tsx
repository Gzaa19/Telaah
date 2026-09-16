"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ShieldCheck,
  HardDrive,
  CheckCircle,
  ArrowRight,
  CircleNotch,
  BookOpen,
  Sparkle,
} from "@phosphor-icons/react";
import { fetchCurrentUser, getGoogleLoginUrl } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * ponytail: Landing page for Telaah Journal Paper Generator using Tailwind CSS, shadcn & Phosphor icons
 */
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-400">
        <CircleNotch size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Header / Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <FileText size={18} weight="bold" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">TELAAH</span>
              <span className="text-xs text-blue-400 font-medium tracking-wider uppercase">
                Scientific Paper AI
              </span>
            </div>
          </div>

          <Button
            variant="google"
            size="sm"
            onClick={handleLogin}
            id="login-button-header"
            className="flex items-center gap-2"
          >
            <GoogleGLogo />
            <span>Masuk dengan Google</span>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Value Proposition */}
        <div className="lg:col-span-6 space-y-6 text-left">
          <div className="inline-flex items-center gap-2">
            <Badge variant="info" className="gap-1.5 py-1 px-3">
              <Sparkle size={13} weight="fill" />
              <span>Publikasi Jurnal Terindeks (Scopus / SINTA / IEEE)</span>
            </Badge>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Penyusun Draf Paper Jurnal Ilmiah Otomatis & Presisi
          </h1>

          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-xl">
            Tautkan literatur riset dari Google Drive Anda, temukan sintesis bukti empiris berkecepatan tinggi dengan <em>pgvector</em>, dan hasilkan draf manuskrip terstruktur IMRaD dengan sitasi tertelusuri.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-4 items-start">
            <Button
              variant="google"
              size="lg"
              onClick={handleLogin}
              id="login-button-hero"
              className="w-full sm:w-auto text-slate-900 font-semibold px-6 py-3 shadow-md"
            >
              <GoogleGLogo />
              <span>Mulai Susun Paper dengan Google</span>
              <ArrowRight size={16} weight="bold" className="ml-1" />
            </Button>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
              <span>Struktur Standar IMRaD</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
              <span>Sitasi Tertelusuri ke Sumber PDF</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
              <span>Enkripsi Kredensial AES-256</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={15} weight="fill" className="text-emerald-400 shrink-0" />
              <span>Hak Cipta 100% Milik Peneliti</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Manuscript Document Preview */}
        <div className="lg:col-span-6">
          <Card className="border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
            {/* Document Window Top Bar */}
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
                <span>MANUSCRIPT_SCOPUS_Q1_DRAFT.tex</span>
              </div>
              <Badge variant="success" className="text-[11px] py-0 px-2">
                <CheckCircle size={11} weight="fill" /> 18 Literatur Terindeks
              </Badge>
            </div>

            {/* Document Content */}
            <CardContent className="p-6 space-y-4 text-left">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                  Target Publikasi: IEEE Transactions / Q1 Journal
                </span>
                <h3 className="text-base font-bold text-white mt-1 leading-snug">
                  Multi-Aspect Semantic Synthesis for Academic Papers Using State-Space Hyena Architectures
                </h3>
              </div>

              <div className="border-t border-slate-800/80 pt-3 space-y-2">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  1. INTRODUCTION & RELATED LITERATURE
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ...while traditional Transformer-based retrieval approaches encounter quadratic bottleneck scaling over lengthy scientific context, empirical findings by{" "}
                  <span className="inline-flex items-center gap-1 bg-blue-950/60 border border-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-mono text-[11px]">
                    <HardDrive size={10} weight="bold" /> [Ref: Sutrisno_2025.pdf, p. 7]
                  </span>{" "}
                  demonstrate that sub-quadratic convolution filters reduce memory complexity by up to 34% without sacrificing citation faithfulness{" "}
                  <span className="inline-flex items-center gap-1 bg-blue-950/60 border border-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-mono text-[11px]">
                    <HardDrive size={10} weight="bold" /> [Ref: Zhang_et_al_IEEE.pdf]
                  </span>
                  ...
                </p>
              </div>

              <div className="rounded-md bg-slate-950/80 border border-slate-800/80 p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck size={16} weight="fill" className="text-emerald-400" />
                  <span>Traceability Sitasi: 100% tervalidasi terhadap berkas PDF Google Drive</span>
                </div>
                <span className="font-mono text-blue-400 font-semibold">pgvector</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TELAAH Research Assistant © 2026. Platform Penyusun Draf Paper Jurnal Ilmiah.</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI + PostgreSQL (pgvector)</span>
            <span>Next.js + Tailwind CSS</span>
            <span>Google Drive API</span>
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
