"use client";

import React from "react";
import { AlertTriangle, HardDrive, ArrowRight, X, ShieldCheck } from "lucide-react";
import { getGoogleLoginUrl } from "@/lib/api/auth";

interface DriveWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DriveWarningModal({ isOpen, onClose }: DriveWarningModalProps) {
  if (!isOpen) return null;

  const handleGrantAccess = () => {
    window.location.href = getGoogleLoginUrl("consent");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(5, 8, 15, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        className="academic-card"
        style={{
          maxWidth: "480px",
          width: "100%",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            color: "var(--text-tertiary)",
          }}
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div
            style={{
              backgroundColor: "var(--amber-bg)",
              color: "var(--amber-warning)",
              padding: "0.6rem",
              borderRadius: "0.375rem",
              display: "flex",
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Otorisasi Google Drive Diperlukan
            </h3>
            <span className="status-pill warning" style={{ marginTop: "0.2rem" }}>
              Izin Baca Terbatas
            </span>
          </div>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          Platform membutuhkan akses baca (<em>read-only</em>) ke Google Drive Anda untuk mengekstrak teks jurnal,
          membuat indeks semantik vektor (<em>pgvector</em>), dan menjamin keakuratan sitasi otomatis dalam proposal.
        </p>

        <div
          style={{
            backgroundColor: "var(--bg-canvas)",
            padding: "0.75rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid var(--border-dim)",
            marginBottom: "1.5rem",
            fontSize: "0.8rem",
            color: "var(--text-tertiary)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
          }}
        >
          <ShieldCheck size={18} color="var(--emerald-success)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Scope <code>drive.readonly</code>: Aplikasi <strong>tidak dapat</strong> mengedit, menghapus, atau membagikan berkas Drive Anda.
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn-base btn-ghost">
            Nanti Saja
          </button>
          <button onClick={handleGrantAccess} className="btn-base btn-brand">
            <span>Beri Izin Akses Drive</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
