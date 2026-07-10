"use client";

import type React from "react";
import {
  Calendar,
  FileText,
  FolderOpen,
  BookText,
  Receipt,
  Building2,
  HelpCircle,
  PlusSquare,
  Clock,
  FileSignature,
  FilePlus2,
  MessageSquarePlus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  href: string;
}

// ─── Portal Guide items ───────────────────────────────────────────────────────

const portalSections = [
  {
    icon: FolderOpen,
    label: "My Documents",
    href: "/mgdashboard/documents",
    description: "Access files shared by the MG Consulting team, and upload documents we've requested from you.",
  },
  {
    icon: FileSignature,
    label: "Contracts & Agreements",
    href: "/mgdashboard/contracts",
    description: "Review and e-sign your service agreements. You'll be notified when a new contract is ready.",
  },
  {
    icon: BookText,
    label: "Resource Library",
    href: "/mgdashboard/resources",
    description: "Browse guides, videos, and templates curated by our team to support your business growth.",
  },
  {
    icon: Calendar,
    label: "Appointments",
    href: "/mgdashboard/appointments",
    description: "Book sessions with our consultants directly via Calendly — pick a time that works for you.",
  },
  {
    icon: Receipt,
    label: "Billing & Invoices",
    href: "/mgdashboard/billing",
    description: "View your invoices and payment history. Reach out to support if anything looks incorrect.",
  },
  {
    icon: Building2,
    label: "Company Profile",
    href: "/mgdashboard/company",
    description: "Keep your contact details and company information up to date for a smooth experience.",
  },
  {
    icon: HelpCircle,
    label: "Support",
    href: "/mgdashboard/questions",
    description: "Submit a question or request and our team will get back to you as quickly as possible.",
  },
  {
    icon: PlusSquare,
    label: "Service Add-ons",
    href: "/mgdashboard/addon",
    description: "Explore optional add-ons like priority support, advanced analytics, and API access.",
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const firstName = (profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there")
    .split(" ")[0];

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Fetch recent activity from multiple sources and merge/sort
  useEffect(() => {
    async function loadActivity() {
      try {
        const results: ActivityItem[] = [];

        // Contracts
        const contractsRes = await fetch("/api/contracts/list", { credentials: "include" }).catch((e) => { console.error("[Activity] contracts fetch error:", e); return null; });
        console.log("[Activity] contracts status:", contractsRes?.status);
        if (contractsRes?.ok) {
          const json = await contractsRes.json().catch(() => ({}));
          console.log("[Activity] contracts json:", json);
          const contracts: any[] = json?.contracts || json?.data || [];
          contracts.slice(0, 3).forEach((c) => {
            const isSigned = c.status === "signed" || c.status === "completed";
            results.push({
              id: `contract-${c.id}`,
              icon: FileSignature,
              iconColor: isSigned ? "text-green-600" : "text-[#264f5e]",
              iconBg: isSigned ? "bg-green-100" : "bg-[#264f5e]/10",
              title: isSigned ? `Contract signed` : `Contract ready to sign`,
              description: c.title || c.name || "Service Agreement",
              time: c.updated_at || c.created_at,
              href: "/mgdashboard/contracts",
            });
          });
        }

        // Client-uploaded documents
        const docsRes = await fetch("/api/client/documents", { credentials: "include" }).catch((e) => { console.error("[Activity] docs fetch error:", e); return null; });
        console.log("[Activity] docs status:", docsRes?.status);
        if (docsRes?.ok) {
          const json = await docsRes.json().catch(() => ({}));
          console.log("[Activity] docs json:", json);
          const docs: any[] = json?.documents || json?.data || [];
          docs.slice(0, 3).forEach((d) => {
            results.push({
              id: `doc-${d.id}`,
              icon: FilePlus2,
              iconColor: "text-[#264f5e]",
              iconBg: "bg-[#264f5e]/10",
              title: "Document uploaded",
              description: d.title || d.name || "Uploaded file",
              time: d.created_at,
              href: "/mgdashboard/documents",
            });
          });
        }

        // Admin-shared documents (WorkDrive)
        const wdRes = await fetch("/api/workdrive/files", { credentials: "include" }).catch((e) => { console.error("[Activity] workdrive fetch error:", e); return null; });
        console.log("[Activity] workdrive status:", wdRes?.status);
        if (wdRes?.ok) {
          const json = await wdRes.json().catch(() => ({}));
          console.log("[Activity] workdrive json keys:", Object.keys(json), "files count:", json?.files?.length);
          const rootItems: any[] = json?.files || [];

          // Collect all items: root-level files + files inside subfolders (1 level deep)
          const allItems: any[] = [];

          for (const item of rootItems) {
            if (!item.is_folder) {
              allItems.push({ ...item, _source: "root" });
            } else {
              // Fetch inside this subfolder
              const subRes = await fetch(
                `/api/workdrive/files?folderId=${encodeURIComponent(item.id)}`,
                { credentials: "include" }
              ).catch(() => null);
              if (subRes?.ok) {
                const subJson = await subRes.json().catch(() => ({}));
                const subFiles: any[] = (subJson?.files || []).filter((f: any) => !f.is_folder);
                subFiles.forEach((f: any) => allItems.push({ ...f, _folderName: item.name }));
              }
            }
          }

          // Sort by created_time descending and take top 4
          allItems
            .sort((a, b) => Number(b.created_time || 0) - Number(a.created_time || 0))
            .slice(0, 4)
            .forEach((f) => {
              results.push({
                id: `wd-${f.id}`,
                icon: FolderOpen,
                iconColor: "text-[#264f5e]",
                iconBg: "bg-[#264f5e]/10",
                title: "Document shared by admin",
                description: f._folderName ? `${f.name} (in ${f._folderName})` : f.name || "Shared file",
                time: f.created_time ? new Date(Number(f.created_time)).toISOString() : new Date().toISOString(),
                href: "/mgdashboard/documents",
              });
            });
        }

        // Support tickets
        const supportRes = await fetch("/api/support/recent", { credentials: "include" }).catch((e) => { console.error("[Activity] support fetch error:", e); return null; });
        console.log("[Activity] support status:", supportRes?.status);
        if (supportRes?.ok) {
          const json = await supportRes.json().catch(() => ({}));
          console.log("[Activity] support json:", json);
          const tickets: any[] = json?.data || [];
          tickets.slice(0, 2).forEach((t) => {
            const isResolved = t.status === "resolved";
            results.push({
              id: `ticket-${t.id}`,
              icon: MessageSquarePlus,
              iconColor: isResolved ? "text-green-600" : "text-amber-600",
              iconBg: isResolved ? "bg-green-100" : "bg-amber-100",
              title: isResolved ? "Support ticket resolved" : "Support ticket submitted",
              description: t.subject || "Support request",
              time: t.created_at,
              href: "/mgdashboard/questions",
            });
          });
        }

        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
        console.log("[Activity] total results before 24hr filter:", results.length);
        // Sort by time descending, filter to last 24hrs only
        const recent = results
          .filter((r) => new Date(r.time).getTime() >= cutoff)
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setActivity(recent.slice(0, 6));
      } catch (e) {
        console.error("[Activity] loadActivity error:", e);
      } finally {
        setActivityLoading(false);
      }
    }
    loadActivity();
  }, []);

  return (
    <div className="p-6 sm:p-8">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#264f5e] uppercase tracking-widest mb-1">Dashboard</p>
        <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Here's an overview of your portal and recent activity.
        </p>
      </div>

      <div className="space-y-4">

          {/* Book appointment CTA */}
          <div className="bg-[#264f5e] rounded-3xl p-6 sm:p-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Book a consultation</h2>
              <p className="text-sm text-white/70 mt-1">Schedule time with our team to align on your goals and milestones.</p>
            </div>
            <Link
              href="/mgdashboard/appointments"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#264f5e] hover:bg-gray-100 font-medium text-sm transition-all"
            >
              <Calendar size={15} />
              Book now
            </Link>
          </div>

          {/* ── Recent Activity (full width) ── */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#264f5e]/10 flex items-center justify-center">
                <Clock size={14} className="text-[#264f5e]" />
              </div>
              <h2 className="font-semibold text-[15px] text-[#1d1d1f]">Recent Activity</h2>
            </div>

            {activityLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 items-start p-3 rounded-2xl bg-[#f5f5f7]">
                    <div className="w-8 h-8 rounded-xl bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="flex items-center gap-4 py-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f7] flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-gray-300" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-500">No activity in the last 24 hours</p>
                  <p className="text-xs text-gray-400 mt-0.5">Document uploads, contract signings and support tickets from today will appear here</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {activity.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start gap-3 p-3 rounded-2xl hover:bg-[#f5f5f7] transition-colors group"
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center mt-0.5`}>
                      <item.icon size={14} className={item.iconColor} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#1d1d1f]">{item.title}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
                      <p className="text-[10px] text-gray-300 mt-1">
                        {item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Portal Guide */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8">
            <button 
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div>
                <h2 className="font-semibold text-[15px] text-[#1d1d1f]">Your Portal Guide</h2>
                <p className="text-xs text-gray-400 mt-0.5 group-hover:text-gray-500 transition-colors">Everything available to you — and where to find it</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600 transition-all">
                {isGuideOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>
            
            {isGuideOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 divide-y-0 mt-6 pt-6 border-t border-gray-50">
                {portalSections.map((section) => (
                  <Link
                    key={section.href}
                    href={section.href}
                    className="flex items-start gap-3 p-3 rounded-2xl group hover:bg-[#f5f5f7] transition-colors"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-[#264f5e]/10 flex items-center justify-center mt-0.5">
                      <section.icon size={15} className="text-[#264f5e]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1d1d1f] flex items-center gap-1">{section.label} <ChevronRight size={12} className="text-gray-300 group-hover:text-[#264f5e] transition-colors" /></p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{section.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
      </div>
    </div>
  );
}
