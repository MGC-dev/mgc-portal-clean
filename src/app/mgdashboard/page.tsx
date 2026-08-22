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
  FileSignature,
  MessageSquarePlus,
  CheckCircle2,
  Timer,
  AlertTriangle,
  Upload,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import ClientTasks, { type TaskStats } from "./ClientTasks";

/** One figure in the headline strip: bold number, muted label, on one line. */
function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  tone?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 px-3">
      <Icon size={16} style={{ color: tone || "#264f5e" }} className="shrink-0" />
      <span className="text-[15px] font-semibold text-[#1d1d1f] tabular-nums" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
      <span className="text-[13px] text-gray-500 whitespace-nowrap">{label}</span>
    </span>
  );
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
    label: "Meetings",
    href: "/mgdashboard/meetings",
    description: "Review your meeting notes and summaries, and keep track of what was discussed.",
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

  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Reported upward by <ClientTasks/> so the strip and the board never disagree.
  const [stats, setStats] = useState<TaskStats | null>(null);
  const handleStats = useCallback((s: TaskStats) => setStats(s), []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="px-6 sm:px-8 pb-8">
      {/* ── Greeting: date, salutation, quick actions ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-[13px] text-gray-400">{format(new Date(), "EEEE, do MMMM")}</p>
          <h1 className="text-[30px] leading-tight font-medium text-[#1d1d1f] tracking-[-0.02em] mt-1">
            {greeting}, {firstName}
          </h1>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link
            href="/mgdashboard/questions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium text-[#1d1d1f] bg-black/[0.04] hover:bg-black/[0.07] transition-colors"
          >
            <MessageSquarePlus size={15} />
            Ask a question
          </Link>
          <Link
            href="/mgdashboard/documents"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium text-white bg-[#264f5e] hover:bg-[#1f424e] transition-colors"
          >
            <Upload size={15} />
            Upload document
          </Link>
        </div>
      </div>

      {/* ── Headline numbers, reported by the task board below ── */}
      {stats && stats.total > 0 && (
        <div className="inline-flex flex-wrap items-center rounded-full bg-black/[0.03] px-2 py-2.5 mb-10">
          <Stat icon={CheckCircle2} value={stats.done} label="Tasks completed" />
          <span className="w-px h-5 bg-black/[0.08] mx-1 sm:mx-3" aria-hidden="true" />
          <Stat icon={Timer} value={stats.inProgress} label="In progress" />
          {stats.overdue > 0 && (
            <>
              <span className="w-px h-5 bg-black/[0.08] mx-1 sm:mx-3" aria-hidden="true" />
              <Stat icon={AlertTriangle} value={stats.overdue} label="Overdue" tone="#a52024" />
            </>
          )}
        </div>
      )}

      <div className="space-y-10">

          {/* ── Client tasks from the Bigin task tracker ── */}
          <ClientTasks onStats={handleStats} />

          {/* Portal Guide */}
          <section>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 mt-6 pt-6 border-t border-black/[0.06]">
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
