import { getUserAndProfile } from "@/lib/supabase-server";
import AdminUsersTable from "@/components/admin-users-table";
import LogoutButton from "@/components/logout-button";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, profile } = await getUserAndProfile();

  const name = profile?.full_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <LogoutButton />
        </header>

        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Welcome, {name}</h2>
          <p className="text-gray-600 mt-2">
            Use this panel to manage users, appointments, resources, and billing.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border p-6">
            <h3 className="font-semibold">Quick Links</h3>
            <ul className="list-disc list-inside mt-3 space-y-2">
              <li>
                <Link href="/admin/users" className="text-blue-600 hover:underline">
                  Users & Roles
                </Link>
              </li>
              <li>
                <Link href="/admin/appointments" className="text-blue-600 hover:underline">
                  Appointments
                </Link>
              </li>
              <li>
                <Link href="/admin/resources" className="text-blue-600 hover:underline">
                  Resource Library
                </Link>
              </li>
              <li>
                <Link href="/admin/billing" className="text-blue-600 hover:underline">
                  Billing & Invoices
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border p-6">
            <h3 className="font-semibold">System Status</h3>
            <div className="mt-3 text-sm text-gray-700">
              <p>
                Role: <span className="font-medium">{profile?.role || "unknown"}</span>
              </p>
              <p>User ID: {user?.id}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-6">
          <h3 className="font-semibold">All Users</h3>
          <p className="text-sm text-gray-600 mt-2">View and manage user accounts pulled directly from the database.</p>
          <div className="mt-4">
            <AdminUsersTable />
          </div>
        </section>
      </div>
    </div>
  );
}