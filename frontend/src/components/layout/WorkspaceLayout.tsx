"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  SquaresFour,
  Books,
  HardDrive,
  Article,
  Sparkle,
  Plus,
  SignOut,
  User,
  CheckCircle,
  Warning,
  CircleNotch,
  List,
  X,
  Database,
  ArrowRight,
  Flask,
  Code,
  ListNumbers,
} from "@phosphor-icons/react";
import { fetchCurrentUser, logout, ResearcherProfile, getGoogleLoginUrl } from "@/lib/api/auth";
import { DriveWarningModal } from "@/components/DriveWarningModal";
import { Button } from "@/components/ui/button";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

/**
 * tasteskill: WorkspaceLayout precisely styled to match the Academic Editorial Canvas (DESIGN.md)
 * and user's reference mockup.
 * Typography: Newsreader serif for brand, Inter for navigation, JetBrains Mono for metadata badges.
 * Colors: Surface warm-paper (#f7f6f3), hairlines (#e5e7eb), active card (#eae7e7),
 * Royal Blue (#0037b0 / #1d4ed8), Archival Emerald (#006c4a / #82f5c1).
 */
export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDriveWarning, setShowDriveWarning] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function initUser() {
      const user = await fetchCurrentUser();
      if (!user) {
        router.push("/");
        return;
      }
      setProfile(user);
      setLoading(false);

      if (!user.is_drive_granted) {
        setShowDriveWarning(true);
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/documents`,
          { credentials: "include" }
        );
        if (res.ok) {
          const docs = await res.json();
          setDocCount(Array.isArray(docs) ? docs.length : 0);
        }
      } catch {
        // Non-blocking
      }
    }
    initUser();
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.push("/");
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fcf9f8] text-[#434655]">
        <CircleNotch size={32} className="animate-spin text-[#0037b0]" />
      </div>
    );
  }

  const sessionExpiry = profile.session_expires_at
    ? new Date(profile.session_expires_at).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    : "20.18 WIB";

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: SquaresFour,
      isActive: pathname === "/dashboard",
      badge: null,
    },
    {
      label: "Pustaka Literatur",
      href: "/library",
      icon: Books,
      isActive: pathname === "/library",
      badge: docCount !== null ? `${docCount}` : "1",
      badgeType: "default",
    },
    {
      label: "Google Drive",
      href: "/library/drive-browser",
      icon: HardDrive,
      isActive: pathname.startsWith("/library/drive-browser"),
      badge: profile.is_drive_granted ? "• Tersambung" : "Izin",
      badgeType: profile.is_drive_granted ? "green-pill" : "warning",
    },
  ];

  const secondaryNavItems = [
    {
      label: "Outline Generator",
      href: "/workspace/outline",
      icon: ListNumbers,
      isActive: pathname.startsWith("/workspace/outline"),
      badge: null,
    },
    {
      label: "Draf Paper IMRaD",
      href: "/workspace/paper",
      icon: Article,
      isActive: pathname.startsWith("/workspace/paper"),
      badge: "1 Paper",
      badgeType: "gray",
    },
    {
      label: "Uji Similarity",
      href: "/library#similarity",
      icon: Sparkle,
      isActive: false,
      badge: null,
    },
    {
      label: "<> LaTeX / BibTeX",
      href: "/workspace/latex-preview",
      icon: Code,
      isActive: pathname.startsWith("/workspace/latex-preview"),
      badge: null,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-[#f7f6f3] text-left">
      {/* Top Sidebar: Brand & Navigation */}
      <div className="space-y-4">
        {/* Brand Logo exactly as in reference */}
        <div className="px-5 pt-5 pb-2">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-[#0037b0] flex items-center justify-center text-white shadow-xs group-hover:bg-[#1d4ed8] transition-colors shrink-0">
              <FileText size={18} weight="bold" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-serif font-bold text-base tracking-tight text-[#1c1b1b] leading-tight">
                TELAAH
              </span>
              <span className="text-[9.5px] text-[#434655] font-mono font-medium tracking-wider uppercase">
                Scientific Paper AI
              </span>
            </div>
          </Link>
        </div>

        {/* Primary CTA Button */}
        <div className="px-4">
          <Link href="/workspace/paper" className="block w-full">
            <Button
              size="sm"
              className="w-full text-xs font-semibold bg-[#0037b0] hover:bg-[#1d4ed8] text-white shadow-xs gap-1.5 h-8.5 justify-center cursor-pointer rounded-md font-sans"
            >
              <Plus size={14} weight="bold" />
              <span>Manuskrip Baru</span>
            </Button>
          </Link>
        </div>

        {/* Navigation Group 1: Core Navigation */}
        <div className="px-3 space-y-1">
          <div className="px-2 pb-1 text-[10px] font-mono font-semibold tracking-wider text-[#747686] uppercase">
            Menu Utama
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  item.isActive
                    ? "bg-[#eae7e7] text-[#1c1b1b] font-semibold"
                    : "text-[#434655] hover:text-[#1c1b1b] hover:bg-[#f0eded]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    weight={item.isActive ? "bold" : "regular"}
                    className={item.isActive ? "text-[#1c1b1b]" : "text-[#747686]"}
                  />
                  <span className="font-sans">{item.label}</span>
                </div>
                {item.badge && item.badgeType === "green-pill" && (
                  <span className="text-[10px] px-2 py-0.5 font-sans font-medium rounded-full bg-[#82f5c1] text-[#005137]">
                    {item.badge}
                  </span>
                )}
                {item.badge && item.badgeType === "default" && (
                  <span className="text-[10.5px] px-1.5 py-0 font-mono rounded bg-[#eae7e7] text-[#434655]">
                    {item.badge}
                  </span>
                )}
                {item.badge && item.badgeType === "warning" && (
                  <span className="text-[10px] px-1.5 py-0 font-mono rounded bg-[#fffbeb] text-[#b45309] border border-[#fed7aa]">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Navigation Group 2: Research Modules */}
        <div className="px-3 space-y-1">
          <div className="px-2 pb-1 text-[10px] font-mono font-semibold tracking-wider text-[#747686] uppercase">
            Alur Penulisan
          </div>
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  item.isActive
                    ? "bg-[#eae7e7] text-[#1c1b1b] font-semibold"
                    : "text-[#434655] hover:text-[#1c1b1b] hover:bg-[#f0eded]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    weight={item.isActive ? "bold" : "regular"}
                    className={item.isActive ? "text-[#1c1b1b]" : "text-[#747686]"}
                  />
                  <span className="font-sans">{item.label}</span>
                </div>
                {item.badge && item.badgeType === "gray" && (
                  <span className="text-[10.5px] px-1.5 py-0 font-mono rounded bg-[#eae7e7] text-[#434655]">
                    {item.badge}
                  </span>
                )}
                {item.badge && item.badgeType === "blue" && (
                  <span className="text-[10.5px] px-1.5 py-0 font-mono rounded bg-[#dce1ff] text-[#001551] font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Sidebar: Drive Status Card & User Profile */}
      <div className="p-3.5 space-y-3">
        {/* Drive Status Mini-Widget matching reference */}
        <div className="p-2.5 rounded-lg border border-[#e5e7eb] bg-white text-left space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#82f5c1]/30 text-[#006c4a]">
                <HardDrive size={15} weight="regular" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-[#1c1b1b] text-xs font-sans leading-tight">Google Drive</span>
                <span className="text-[10px] text-[#434655] font-sans">Terhubung & Siap</span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#006c4a]"></span>
          </div>
        </div>

        {/* User Profile Bar matching reference */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e5e7eb]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7.5 h-7.5 rounded-full bg-[#0037b0] text-white flex items-center justify-center shrink-0 text-xs font-medium">
              <User size={15} weight="bold" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-semibold text-[#1c1b1b] truncate font-sans">
                {profile.full_name}
              </span>
              <span className="text-[10.5px] text-[#747686] font-mono truncate">
                Sesi: {sessionExpiry}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Keluar dari akun"
            className="h-7 w-7 p-0 text-[#747686] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 shrink-0 rounded"
          >
            <SignOut size={15} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Dynamic breadcrumb metadata based on active route
  const getBreadcrumb = () => {
    if (pathname.startsWith("/library/drive-browser")) {
      return {
        section: "Pustaka Literatur",
        current: "Google Drive",
        badge: "Pustaka Riset",
      };
    }
    if (pathname.startsWith("/library")) {
      return {
        section: "Pustaka Literatur",
        current: "Basis Pengetahuan",
        badge: docCount !== null ? `${docCount} Dokumen` : "Pustaka",
      };
    }
    if (pathname.match(/^\/workspace\/outline\/[^/]+/)) {
      return {
        section: "Alur Penulisan",
        current: "Editor Outline",
        badge: "iciCos / IEEE",
      };
    }
    if (pathname.startsWith("/workspace/outline")) {
      return {
        section: "Alur Penulisan",
        current: "Outline Generator",
        badge: "iciCos / IEEE",
      };
    }
    if (pathname.startsWith("/workspace/paper")) {
      return {
        section: "Alur Penulisan",
        current: "Workspace Paper",
        badge: "iciCos / IEEE",
      };
    }
    if (pathname.startsWith("/workspace/latex-preview")) {
      return {
        section: "Alur Penulisan",
        current: "LaTeX & BibTeX",
        badge: "IEEEtran",
      };
    }
    return {
      section: "Menu Utama",
      current: "Dashboard",
      badge: "iciCos / IEEE",
    };
  };

  const breadcrumb = getBreadcrumb();

  return (
    <div className="min-h-screen flex bg-[#fcf9f8] text-[#1c1b1b] selection:bg-[#0037b0] selection:text-white">
      {/* Desktop Fixed Left Sidebar (260px) */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 border-r border-[#e5e7eb] bg-[#f7f6f3] z-30">
        {sidebarContent}
      </aside>

      {/* Main Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar Header: Sleek 44px Academic Breadcrumb Bar */}
        <header className="h-11 border-b border-[#e5e7eb] bg-[#fcf9f8] px-5 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs font-sans text-[#434655] min-w-0">
            <Flask size={14} className="text-[#0037b0] shrink-0" weight="duotone" />
            <span className="font-semibold text-[#1c1b1b] shrink-0">Telaah Lab</span>
            <span className="text-[#c4c5d7] font-mono text-[11px] shrink-0">/</span>
            <span className="text-[#747686] shrink-0 hidden sm:inline">{breadcrumb.section}</span>
            <span className="text-[#c4c5d7] font-mono text-[11px] shrink-0 hidden sm:inline">/</span>
            <span className="font-medium text-[#1c1b1b] truncate">{breadcrumb.current}</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10.5px] text-[#747686] shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#e5e7eb] bg-white text-[#006c4a] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]" />
              <span>Aktif</span>
            </span>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded border border-[#e5e7eb] bg-white text-[#434655]">
              {breadcrumb.badge}
            </span>
          </div>
        </header>

        {/* Mobile Top Navbar (Small screen) */}
        <div className="lg:hidden h-11 bg-[#f7f6f3] border-b border-[#e5e7eb] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#0037b0] flex items-center justify-center text-white">
              <FileText size={14} weight="bold" />
            </div>
            <span className="font-serif font-bold text-sm text-[#1c1b1b]">TELAAH</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-7 w-7 p-0 border-[#e5e7eb]"
          >
            {mobileMenuOpen ? <X size={16} /> : <List size={16} />}
          </Button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-2xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] h-full bg-[#f7f6f3] border-r border-[#e5e7eb] z-50">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {children}
        </div>
      </div>

      {/* Drive Scope Warning Modal */}
      <DriveWarningModal
        isOpen={showDriveWarning}
        onClose={() => setShowDriveWarning(false)}
      />
    </div>
  );
}
