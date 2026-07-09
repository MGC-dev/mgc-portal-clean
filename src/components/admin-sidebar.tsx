"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  FileText,
  HelpCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Shield,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Client Documents",
    href: "/admin/client-documents",
    icon: FolderOpen,
  },
  {
    label: "Contracts",
    href: "/admin/contracts",
    icon: FileText,
  },
  {
    label: "Resource Library",
    href: "/admin/resources",
    icon: BookOpen,
  },
  {
    label: "Client Uploads",
    href: "/admin/client-uploads",
    icon: Upload,
  },
  {
    label: "Users & Roles",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Support Tickets",
    href: "/admin/support",
    icon: HelpCircle,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { signOut } = useAuth();

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

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b border-[#e8eef1] ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <div className="shrink-0 h-9 w-9 rounded-xl overflow-hidden bg-[#264f5e]/10 flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="MG Consulting"
            width={36}
            height={36}
            priority
            style={{ objectFit: "contain" }}
          />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="font-semibold text-[#1a3340] text-sm leading-tight whitespace-nowrap">
                MG Consulting
              </p>
              <p className="text-[10px] text-[#264f5e] font-medium tracking-wide uppercase whitespace-nowrap">
                Admin Portal
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Admin badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-4 mt-4 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#264f5e]/8 border border-[#264f5e]/15"
          >
            <Shield size={13} className="text-[#264f5e] shrink-0" />
            <span className="text-[11px] font-medium text-[#264f5e] tracking-wide">
              Administrator
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 group
                ${collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"}
                ${
                  active
                    ? "bg-[#264f5e] text-white shadow-sm shadow-[#264f5e]/30"
                    : "text-[#4a6672] hover:bg-[#264f5e]/8 hover:text-[#264f5e]"
                }
              `}
            >
              {active && (
                <motion.span
                  layoutId="admin-nav-active"
                  className="absolute inset-0 rounded-xl bg-[#264f5e]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  style={{ zIndex: 0 }}
                />
              )}
              <Icon
                size={17}
                className={`relative z-10 shrink-0 transition-colors ${
                  active ? "text-white" : "text-[#6b8a96] group-hover:text-[#264f5e]"
                }`}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`relative z-10 text-sm font-medium whitespace-nowrap overflow-hidden ${
                      active ? "text-white" : ""
                    }`}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: collapse + logout */}
      <div className="px-3 pb-4 border-t border-[#e8eef1] pt-3 space-y-1">
        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[#6b8a96] hover:bg-[#264f5e]/8 hover:text-[#264f5e] transition-all duration-200 ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={17} /> : (
            <>
              <ChevronLeft size={17} />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[#6b8a96] hover:bg-red-50 hover:text-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut size={17} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                {signingOut ? "Signing out..." : "Sign Out"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-[#e8eef1] shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg overflow-hidden bg-[#264f5e]/10 flex items-center justify-center">
            <Image src="/logo.png" alt="MG Consulting" width={28} height={28} style={{ objectFit: "contain" }} />
          </div>
          <span className="font-semibold text-[#1a3340] text-sm">MG Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-[#264f5e]/8 text-[#264f5e] transition-colors"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/30 z-50 md:hidden backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-2xl md:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="hidden md:flex flex-col h-screen bg-white border-r border-[#e8eef1] sticky top-0 overflow-hidden shrink-0"
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
