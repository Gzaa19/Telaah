import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telaah - AI Scientific Journal Paper & Manuscript Generator",
  description: "Asisten cerdas penyusun draf paper jurnal penelitian ilmiah berstandar publikasi (IEEE, Elsevier, Scopus, SINTA) berbasis RAG Google Drive & pgvector",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
