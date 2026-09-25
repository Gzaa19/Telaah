import React from "react";
import Link from "next/link";
import { FileMagnifyingGlass, ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f8] text-[#1c1b1b] p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-[#eff6ff] text-[#0037b0] flex items-center justify-center mb-4 border border-[#bfdbfe]">
        <FileMagnifyingGlass size={24} weight="duotone" />
      </div>
      <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1c1b1b] mb-1">
        404 - Halaman Tidak Ditemukan
      </h1>
      <p className="text-xs text-[#434655] max-w-sm mb-6 leading-relaxed">
        Halaman atau dokumen manuskrip yang Anda cari tidak tersedia di workspace Telaah.
      </p>
      <Link href="/dashboard">
        <Button
          size="sm"
          className="bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-xs gap-1.5 h-8.5 rounded shadow-2xs cursor-pointer"
        >
          <ArrowLeft size={14} weight="bold" />
          <span>Kembali ke Dashboard</span>
        </Button>
      </Link>
    </div>
  );
}
