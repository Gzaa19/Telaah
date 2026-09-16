"use client";

import React from "react";
import { AlertTriangle, HardDrive, ArrowRight, X } from "lucide-react";
import { getGoogleLoginUrl } from "@/lib/api/auth";

interface DriveWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DriveWarningModal({ isOpen, onClose }: DriveWarningModalProps) {
  if (!isOpen) return null;

  const handleGrantAccess = () => {
    // Redirect with prompt=consent to ensure Google displays the Drive scope consent checkbox
    window.location.href = getGoogleLoginUrl("consent");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "520px",
          width: "100%",
          backgroundColor: "#1e293b",
          border: "1px solid #f59e0b",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
          position: "relative",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            color: "#94a3b8",
            padding: "0.25rem",
            borderRadius: "0.25rem",
          }}
          aria-label="Tutup modal"
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.2)",
              color: "#fbbf24",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc" }}>
              Akses Google Drive Belum Diizinkan
            </h3>
            <span className="badge badge-warning" style={{ marginTop: "0.25rem" }}>
              Mode Terbatas
            </span>
          </div>
        </div>

        <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          Aplikasi memerlukan izin baca ke Google Drive Anda agar dapat mengambil literatur referensi, 
          membuat representasi vektor dokumen ilmiah (<em>pgvector</em>), dan memvalidasi sitasi proposal secara akurat.
        </p>

        <div
          style={{
            backgroundColor: "#0f172a",
            padding: "0.875rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #334155",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <HardDrive size={20} style={{ color: "#38bdf8", flexShrink: 0 }} />
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            Scope yang diminta: <code>drive.readonly</code> (hanya membaca file yang Anda pilih, tidak mengubah atau menghapus data).
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: "0.9rem" }}
          >
            Lanjutkan Tanpa Drive
          </button>
          <button
            onClick={handleGrantAccess}
            className="btn btn-primary"
            style={{ fontSize: "0.9rem", backgroundColor: "#d97706" }}
          >
            <span>Beri Akses Google Drive</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
