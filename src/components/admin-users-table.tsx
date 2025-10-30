"use client";

import { useEffect, useState } from "react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

type AdminUser = {
  id: string;
  email: string;
  created_at?: string;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  user_metadata?: any;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    company_name: string | null;
    phone: string | null;
    address: string | null;
    role: string;
    suspended: boolean;
    created_at: string;
    updated_at: string;
  } | null;
};

export default function AdminUsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendDuration, setSuspendDuration] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load users");
      setUsers(json.users || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      await fetchUsers();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  const suspendUser = async (userId: string) => {
    setActionLoading(true);
    try {
      const duration = suspendDuration[userId] || "87600h"; // default ~10 years
      const res = await fetch("/api/admin/suspend-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, duration }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Suspend failed");
      await fetchUsers();
    } catch (e: any) {
      alert(e?.message || "Suspend failed");
    } finally {
      setActionLoading(false);
    }
  };

  const unsuspendUser = async (userId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/unsuspend-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unsuspend failed");
      await fetchUsers();
    } catch (e: any) {
      alert(e?.message || "Unsuspend failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading users...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="rounded-lg border overflow-x-auto relative">
      <LoadingOverlay show={actionLoading} label="Processing..." />
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Company</th>
            <th className="p-3 text-left">Phone</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3 text-left">Suspended</th>
            <th className="p-3 text-left">Created</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const name = u.profile?.full_name || u.email?.split("@")[0] || "";
            const role = u.profile?.role || u.user_metadata?.role || "client";
            const suspended = u.profile?.suspended || Boolean(u.banned_until);
            const created = u.created_at ? new Date(u.created_at).toLocaleDateString() : "";
            return (
              <tr key={u.id} className="border-t">
                <td className="p-3">{name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.profile?.company_name || "-"}</td>
                <td className="p-3">{u.profile?.phone || "-"}</td>
                <td className="p-3">{role}</td>
                <td className="p-3">{suspended ? "Yes" : "No"}</td>
                <td className="p-3">{created}</td>
                <td className="p-3 space-x-2">
                  {suspended ? (
                    <button
                      className="px-3 py-1 rounded bg-green-600 text-white"
                      onClick={() => unsuspendUser(u.id)}
                      disabled={actionLoading}
                    >
                      Unsuspend
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <select
                        className="border rounded px-2 py-1 text-gray-800"
                        value={suspendDuration[u.id] || "87600h"}
                        onChange={(e) =>
                          setSuspendDuration((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                        title="Select suspension duration"
                        disabled={actionLoading}
                      >
                        <option value="1h">1 hour</option>
                        <option value="24h">24 hours</option>
                        <option value="168h">7 days</option>
                        <option value="720h">30 days</option>
                        <option value="87600h">10 years</option>
                      </select>
                      <button
                        className="px-3 py-1 rounded bg-amber-600 text-white"
                        onClick={() => suspendUser(u.id)}
                        disabled={actionLoading}
                      >
                        Suspend
                      </button>
                    </span>
                  )}
                  <button
                    className="px-3 py-1 rounded bg-rose-600 text-white"
                    onClick={() => deleteUser(u.id)}
                    disabled={actionLoading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}