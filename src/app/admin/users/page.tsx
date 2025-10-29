import { getUserAndProfile, requireAdmin } from "@/lib/supabase-server";
import AdminUsersTable from "@/components/admin-users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { user, profile } = await getUserAndProfile();
  const isAdmin = await requireAdmin();
  if (!user || !isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="mt-2">You must be an admin to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin • Users</h1>
      <p className="text-sm text-gray-600">Manage accounts: suspend, unsuspend, or delete users.</p>
      <div>
        <AdminUsersTable />
      </div>
    </div>
  );
}