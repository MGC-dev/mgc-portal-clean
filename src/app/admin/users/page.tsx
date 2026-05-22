import { getUserAndProfile, requireAdmin } from "@/lib/supabase-server";
import AdminUsersTable from "@/components/admin-users-table";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { user, profile } = await getUserAndProfile();
  const isAdmin = await requireAdmin();

  if (!user || !isAdmin) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <p className="text-sm font-semibold text-red-600">Unauthorized</p>
          <p className="text-xs text-red-400 mt-1">You must be an admin to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <header>
        <p className="text-xs font-semibold tracking-widest text-[#264f5e]/60 uppercase mb-1">
          Admin Portal
        </p>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#264f5e]/10 flex items-center justify-center">
            <Users size={18} className="text-[#264f5e]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1a3340] tracking-tight">Users & Roles</h1>
            <p className="text-sm text-[#6b8a96]">Manage accounts — suspend, unsuspend, or remove users</p>
          </div>
        </div>
      </header>

      {/* Table card */}
      <section className="rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eef1]">
          <div>
            <h2 className="text-sm font-semibold text-[#1a3340]">All Users</h2>
            <p className="text-xs text-[#6b8a96] mt-0.5">Every registered account in your organisation</p>
          </div>
        </div>
        <div className="p-4">
          <AdminUsersTable />
        </div>
      </section>
    </div>
  );
}