import { getUserAndProfile } from "@/lib/supabase-server";
import AdminUsersTable from "@/components/admin-users-table";
import Link from "next/link";
import {
  Users,
  BookOpen,
  FileText,
  FolderOpen,
  Upload,
  HelpCircle,
  TrendingUp,
  Shield,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

const quickActions = [
  {
    label: "Users & Roles",
    desc: "Manage accounts & permissions",
    href: "/admin/users",
    icon: Users,
    color: "bg-[#264f5e]/10 text-[#264f5e]",
  },
  {
    label: "Resource Library",
    desc: "Upload & organise resources",
    href: "/admin/resources",
    icon: BookOpen,
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "Contracts",
    desc: "Review & send agreements",
    href: "/admin/contracts",
    icon: FileText,
    color: "bg-amber-50 text-amber-600",
  },
  {
    label: "Clients",
    desc: "WorkDrive documents & files",
    href: "/admin/clients",
    icon: FolderOpen,
    color: "bg-sky-50 text-sky-600",
  },
  {
    label: "Client Uploads",
    desc: "Browse client manual uploads",
    href: "/admin/client-uploads",
    icon: Upload,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Support Tickets",
    desc: "Respond to client queries",
    href: "/admin/support",
    icon: HelpCircle,
    color: "bg-rose-50 text-rose-500",
  },
];

export default async function AdminPage() {
  const { user, profile } = await getUserAndProfile();
  const name = profile?.full_name || user?.email?.split("@")[0] || "Admin";
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">

      {/* Page header */}
      <header>
        <p className="text-xs font-semibold tracking-widest text-[#264f5e]/60 uppercase mb-1">
          Admin Portal
        </p>
        <h1 className="text-2xl font-semibold text-[#1a3340] tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-[#6b8a96] mt-1">
          Overview of your organisation's activity
        </p>
      </header>

      {/* Welcome card */}
      <section
        className="relative rounded-2xl overflow-hidden border border-[#264f5e]/15 bg-white p-6 shadow-sm"
        style={{
          background:
            "linear-gradient(135deg, #264f5e08 0%, #ffffff 60%, #f0f7f9 100%)",
        }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#264f5e]/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="shrink-0 h-12 w-12 rounded-2xl bg-[#264f5e] flex items-center justify-center text-white font-semibold text-base shadow-md shadow-[#264f5e]/30">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-[#1a3340]">
              Welcome back, {name}
            </p>
            <p className="text-sm text-[#6b8a96] mt-0.5">
              Use this panel to manage users, resources, contracts and more.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#264f5e]/10 text-[10px] font-semibold text-[#264f5e] tracking-wide uppercase">
                <Shield size={10} />
                {profile?.role || "Admin"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-600 tracking-wide uppercase">
                <Activity size={10} />
                Active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions grid */}
      <section>
        <h2 className="text-sm font-semibold text-[#1a3340] mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-[#264f5e]" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start gap-4 rounded-2xl border border-[#e8eef1] bg-white p-4 hover:border-[#264f5e]/30 hover:shadow-md hover:shadow-[#264f5e]/8 transition-all duration-200"
              >
                <div
                  className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${action.color} transition-transform duration-200 group-hover:scale-110`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1a3340] group-hover:text-[#264f5e] transition-colors">
                    {action.label}
                  </p>
                  <p className="text-xs text-[#6b8a96] mt-0.5 leading-snug">
                    {action.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* System info */}
      <section className="rounded-2xl border border-[#e8eef1] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1a3340] mb-4">
          Session Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1 rounded-xl bg-[#f6f9fb] border border-[#e8eef1] px-4 py-3">
            <span className="text-[11px] text-[#6b8a96] font-medium uppercase tracking-wide">Role</span>
            <span className="text-sm font-semibold text-[#1a3340] capitalize">
              {profile?.role || "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-[#f6f9fb] border border-[#e8eef1] px-4 py-3">
            <span className="text-[11px] text-[#6b8a96] font-medium uppercase tracking-wide">Email</span>
            <span className="text-sm font-semibold text-[#1a3340] truncate">{user?.email || "—"}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-[#f6f9fb] border border-[#e8eef1] px-4 py-3">
            <span className="text-[11px] text-[#6b8a96] font-medium uppercase tracking-wide">Status</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
        </div>
      </section>

      {/* Users table */}
      <section className="rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eef1]">
          <div>
            <h2 className="text-sm font-semibold text-[#1a3340]">User Management</h2>
            <p className="text-xs text-[#6b8a96] mt-0.5">
              All registered accounts in your organisation
            </p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#264f5e] text-white text-xs font-semibold hover:bg-[#1f3f4c] transition-colors shadow-sm"
          >
            <Users size={13} />
            Manage Users
          </Link>
        </div>
        <div className="p-4">
          <AdminUsersTable />
        </div>
      </section>
    </div>
  );
}