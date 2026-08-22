"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookText,
  Calendar,
  Receipt,
  FileText,
  HelpCircle,
  Building2,
  FolderOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import LogoutButton from "./logout-button";

type MenuItem = { name: string; href: string; icon: React.ElementType };
type MenuGroup = { label?: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  {
    items: [
      { name: "Overview", href: "/mgdashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Documents",
    items: [
      { name: "My Documents",           href: "/mgdashboard/documents",  icon: FolderOpen },
      { name: "Contracts & Agreements", href: "/mgdashboard/contracts",  icon: FileText   },
      { name: "Resource Library",       href: "/mgdashboard/resources",  icon: BookText   },
    ],
  },
  {
    items: [
      { name: "Meetings", href: "/mgdashboard/meetings", icon: Calendar },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Billing & Invoices", href: "/mgdashboard/billing",  icon: Receipt   },
      { name: "Company Profile",    href: "/mgdashboard/company",  icon: Building2 },
    ],
  },
  {
    items: [
      { name: "Support", href: "/mgdashboard/questions", icon: HelpCircle },
    ],
  },
];

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed z-50 top-0 left-0 h-full w-64 bg-white flex flex-col transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex`}
        role="navigation"
        aria-label="Primary"
      >
        {/* Logo / Brand header.
            The artwork is a full lockup — it already reads "MG Consulting Firm" —
            so the only text beside it is "Client Portal"; a typed company name
            here duplicated what the logo already says.
            logo-brand.png rather than logo.png: the original ships an opaque
            #2f4553 field (a desaturated slate, ΔE 6.4 from the brand colour) and
            is tagged Display P3, so it could never sit flush on a #264f5e panel.
            logo-brand.png is the same artwork recomposited onto the brand colour
            and written as plain sRGB, so it matches the round badge exactly.
            See scripts note in the commit — the original logo.png is untouched. */}
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="w-[47px] h-[47px] rounded-full bg-[#264f5e] flex items-center justify-center overflow-hidden shrink-0">
            <Image
              src="/logo-brand.png"
              alt="MG Consulting Firm"
              width={60}
              height={47}
              priority
              /* The default lossy WebP re-encode leaves compression noise in the
                 logo's flat field, so its edges no longer match the badge. A logo
                 is mostly flat colour — encode it losslessly. */
              quality={100}
              className="w-[38px] h-auto"
            />
          </span>
          <p className="text-[13px] font-semibold text-[#1d1d1f] tracking-[-0.01em] leading-none">
            Client Portal
          </p>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-[#e0e0e0] mb-3" />

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-4 overflow-y-auto">
          {menuGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-2 mb-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-[#8e8e93]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isOverview = item.href === "/mgdashboard";
                  const active = isOverview
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-full text-[14px] transition-colors duration-150 ${
                        active
                          ? "text-white font-medium"
                          : "text-[#3c3c43] font-normal hover:bg-[#ebebed]"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-full bg-[#264f5e] shadow-sm"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                      <Icon
                        size={17}
                        strokeWidth={active ? 2 : 1.6}
                        className={`relative z-10 flex-shrink-0 ${active ? "text-white" : "text-[#6e6e73]"}`}
                      />
                      <span className="relative z-10 leading-snug">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        {/* Footer / Logout */}
        <div className="p-4 border-t border-[#e0e0e0]">
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
