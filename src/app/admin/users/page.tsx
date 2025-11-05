import { getUserAndProfile, requireAdmin } from "@/lib/supabase-server";
import AdminUsersTable from "@/components/admin-users-table";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { user, profile } = await getUserAndProfile();
  const isAdmin = await requireAdmin();
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-white text-gray-900 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-semibold">Unauthorized</h1>
          <p className="mt-2">You must be an admin to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin • Users & Roles</h1>
            <p className="text-gray-600 mt-2">Manage user accounts: suspend, unsuspend, or delete users.</p>
          </div>
          <Link href="/admin" className="text-blue-600 hover:underline">
            Back to Admin
          </Link>
        </header>

        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <AdminUsersTable />
        </section>
      </div>
    </div>
  );
}