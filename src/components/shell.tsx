"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Layers,
  Mic,
  Library,
  UserRound,
  ChartNoAxesColumn,
  Settings,
  Shield,
  LogOut,
  WifiOff,
  PenLine,
  GraduationCap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Brand } from "./ui";
import { useApp } from "./context";
export function Shell({ children }: { children: React.ReactNode }) {
  const { user, t } = useApp();
  const path = usePathname();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const nav = [
    { href: "/learn", icon: BookOpen, label: t("Learn", "Belajar") },
    { href: "/review", icon: Layers, label: t("Review", "Review") },
    { href: "/speaking", icon: Mic, label: t("Speak", "Bicara") },
    { href: "/vocabulary", icon: Library, label: t("Vocabulary", "Kosakata") },
    { href: "/profile", icon: UserRound, label: t("Profile", "Profil") },
  ];
  if (path.startsWith("/lesson/") || path === "/onboarding")
    return (
      <>
        {!online && (
          <div className="offline-banner">
            <WifiOff size={16} />
            {t(
              "Offline: grading requires a connection.",
              "Offline: penilaian memerlukan koneksi.",
            )}
          </div>
        )}
        {children}
      </>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard">
          <Brand />
        </Link>
        <p className="sidebar-caption">SPEAK. LEARN. GROW.</p>
        <nav aria-label="Main navigation">
          <Link
            href="/dashboard"
            className={path === "/dashboard" ? "active" : ""}
          >
            <ChartNoAxesColumn size={20} />
            {t("Today", "Hari ini")}
          </Link>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={path.startsWith(n.href) ? "active" : ""}
            >
              <n.icon size={20} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="nav-secondary">
          <Link href="/grammar">
            <GraduationCap size={18} />
            {t("Grammar", "Tata bahasa")}
          </Link>
          <Link href="/hanzi">
            <PenLine size={18} />
            {t("Writing studio", "Latihan menulis")}
          </Link>
          <Link href="/progress">
            <ChartNoAxesColumn size={18} />
            {t("My progress", "Progres saya")}
          </Link>
          <Link href="/settings">
            <Settings size={18} />
            {t("Settings", "Pengaturan")}
          </Link>
          {user && user.role !== "STUDENT" && (
            <Link href="/admin">
              <Shield size={18} />
              Content studio
            </Link>
          )}
        </div>
        <div className="sidebar-foot">
          <div className="avatar">
            {user?.name.slice(0, 1).toUpperCase() ?? "H"}
          </div>
          <div>
            <strong>{user?.name ?? "HanyuFlow"}</strong>
            <small>
              {t(
                "A little progress, every day",
                "Sedikit kemajuan setiap hari",
              )}
            </small>
          </div>
          <button
            className="icon-button"
            aria-label="Logout"
            onClick={() => {
              localStorage.removeItem("hf-offline-words");
              void signOut({ callbackUrl: "/login" });
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="mobile-header">
          <Link href="/dashboard">
            <Brand />
          </Link>
          <Link className="icon-button" href="/settings" aria-label="Settings">
            <Settings size={20} />
          </Link>
        </header>
        {!online && (
          <div className="offline-banner">
            <WifiOff size={16} />
            {t(
              "Offline. Cached vocabulary is available in the offline library.",
              "Offline. Kosakata tersimpan tersedia di pustaka offline.",
            )}
            <Link href="/offline">Offline</Link>
          </div>
        )}
        <main className="main-content">{children}</main>
        <footer className="app-footer">
          {t(
            "Original beginner curriculum · human review pending · no official HSK alignment",
            "Kurikulum pemula asli · menunggu tinjauan ahli · belum dipetakan ke HSK resmi",
          )}
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={path.startsWith(n.href) ? "active" : ""}
          >
            <n.icon size={21} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
