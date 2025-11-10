import { getUserAndProfile } from "@/lib/supabase-server";
import AdminUsersTable from "@/components/admin-users-table";
import LogoutButton from "@/components/logout-button";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, profile } = await getUserAndProfile();

  const name = profile?.full_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
            <p className="text-gray-600 text-sm mt-1">Manage your organization's resources and users</p>
          </div>
          <LogoutButton />
        </header>

        <section className="rounded-lg border p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-lg sm:text-xl font-semibold">Welcome back, {name}</h2>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Use this panel to manage users, resources, and contracts efficiently.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <Link 
                href="/admin/users" 
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-gray-900 font-medium">Users & Roles</span>
                <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link 
                href="/admin/resources" 
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-gray-900 font-medium">Resource Library</span>
                <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link 
                href="/admin/contracts" 
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-gray-900 font-medium">Contracts & Agreements</span>
                <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link 
                href="/admin/client-documents" 
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-gray-900 font-medium">Client Documents</span>
                <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link 
                href="/admin/support" 
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-gray-900 font-medium">Support Tickets</span>
                <span className="text-blue-600 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border p-4 sm:p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              System Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                <span className="text-gray-600">Your Role</span>
                <span className="font-medium text-gray-900 capitalize">{profile?.role || "unknown"}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                <span className="text-gray-600">User ID</span>
                <span className="font-mono text-xs text-gray-700 truncate max-w-32">{user?.id}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                <span className="text-gray-600">Status</span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span className="text-green-700 font-medium">Active</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-lg">User Management</h3>
              <p className="text-sm text-gray-600 mt-1">View and manage all user accounts in your organization</p>
            </div>
            <Link 
              href="/admin/users" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Manage Users
            </Link>
          </div>
          <div className="overflow-hidden">
            <AdminUsersTable />
          </div>
        </section>
      </div>
    </div>
  );
}