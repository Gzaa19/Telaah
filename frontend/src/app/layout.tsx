import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Telaah - AI Scientific Journal Paper & Manuscript Generator",
  description:
    "Asisten cerdas penyusun draf paper jurnal penelitian ilmiah berstandar publikasi (IEEE, Elsevier, Scopus, SINTA) berbasis RAG Google Drive & pgvector",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-slate-950 text-slate-100 min-h-screen selection:bg-blue-600 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
