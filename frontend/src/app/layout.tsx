import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Generator - Scientific Proposal Assistant",
  description: "AI-powered Research Proposal and Scientific Paper Generator with Google Drive & pgvector",
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
