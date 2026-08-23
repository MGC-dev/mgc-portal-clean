"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity,
  Boxes,
  Database,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Route,
  ScrollText,
  Terminal,
  UserCog,
  X,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/dev", icon: LayoutDashboard, exact: true },
  { label: "Health Checks", href: "/dev/health", icon: Activity },
  { label: "Tech Stack", href: "/dev/stack", icon: Boxes },
  { label: "Routes & API", href: "/dev/routes", icon: Route },
  { label: "Environment", href: "/dev/env", icon: KeyRound },
  { label: "Database", href: "/dev/database", icon: Database },
  { label: "Session", href: "/dev/session", icon: UserCog },
  { label: "Event Log", href: "/dev/logs", icon: ScrollText },
];

export default function DevSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { profile, user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch {
      // soft-fail; proceed to redirect
    } finally {
      window.location.href = "/auth/logout";
    }
  };

  const isActive = (item: (typeof navItems)[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const Content = () => (
    <div className="flex flex-col h-full">
      {/* Identity */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="shrink-0 h-9 w-9 rounded-[10px] overflow-hidden bg-white border border-[var(--dev-hairline)] shadow-[var(--dev-shadow-sm)] flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="MG Consulting"
            width={30}
            height={30}
            style={{ objectFit: "contain" }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-[var(--dev-text)] leading-tight tracking-[-0.015em]">
            MG Consulting
          </p>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-[var(--dev-text-tertiary)] mt-0.5">
            Dev Console
          </p>
        </div>
      </div>

      {/* Role chip */}
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-[var(--dev-accent-soft)] px-3 py-2">
        <Terminal size={13} className="text-[var(--dev-accent)] shrink-0" />
        <span className="text-[11.5px] font-medium text-[var(--dev-accent)] truncate tracking-[-0.005em]">
          {profile?.role ?? "developer"}
        </span>
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] tracking-[-0.01em] transition-all duration-200 ${
                active
                  ? "bg-white text-[var(--dev-text)] font-medium shadow-[var(--dev-shadow-sm)] border border-[var(--dev-hairline)]"
                  : "text-[var(--dev-text-secondary)] hover:bg-white/70 hover:text-[var(--dev-text)] border border-transparent"
              }`}
            >
              <Icon
                size={16}
                className={`shrink-0 transition-colors ${
                  active ? "text-[var(--dev-accent)]" : "text-[var(--dev-text-tertiary)]"
                }`}
              />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-3 mx-2 border-t border-[var(--dev-hairline)]">
        <p
          className="px-3 pb-2 text-[11.5px] text-[var(--dev-text-tertiary)] truncate"
          title={user?.email ?? ""}
        >
          {user?.email ?? "—"}
        </p>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-[var(--dev-text-secondary)] hover:bg-[var(--dev-fail-soft)] hover:text-[var(--dev-fail)] transition-colors duration-200 disabled:opacity-45"
        >
          <LogOut size={16} className="shrink-0" />
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile bar — frosted */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl dev-hairline-b">
        <div className="flex items-center gap-2.5">
          <Terminal size={15} className="text-[var(--dev-accent)]" />
          <span className="text-[14px] font-semibold text-[var(--dev-text)] tracking-[-0.015em]">
            Dev Console
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-full text-[var(--dev-text-secondary)] hover:bg-black/5 transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={19} />
        </button>
      </div>

      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 md:hidden"
          />
          <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-[var(--dev-bg)] border-r border-[var(--dev-hairline)] md:hidden">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--dev-text-secondary)] hover:bg-black/5"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
            <Content />
          </div>
        </>
      )}

      <aside className="hidden md:flex flex-col w-[248px] shrink-0 h-screen sticky top-0 bg-[var(--dev-bg)]/80 backdrop-blur-xl border-r border-[var(--dev-hairline)]">
        <Content />
      </aside>
    </>
  );
}
