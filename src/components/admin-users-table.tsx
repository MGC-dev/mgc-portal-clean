"use client";

import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/ui/alert-banner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [banner, setBanner] = useState<{ variant: "success" | "error" | "info"; message: string } | null>(null);
  const [confirmSuspendId, setConfirmSuspendId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function parseJsonOrThrow(res: Response) {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const txt = await res.text().catch(() => Promise.resolve(""));
      const url = (res as any)?.url || "";
      const path = url ? (() => { try { return new URL(url).pathname; } catch { return url; } })() : "";
      if (txt) console.warn("[admin-users] Non-JSON response from", path || url || "unknown", "status", res.status, "body", txt.slice(0, 200));
      throw new Error(`Unexpected non-JSON response (${res.status})${path ? ` from ${path}` : ""}.`);
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status}).`);
    }
    return data;
  }

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { headers: { accept: "application/json" } });
      const json = await parseJsonOrThrow(res);
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
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await parseJsonOrThrow(res);
      await fetchUsers();
      setBanner({ variant: "success", message: "User deleted successfully." });
    } catch (e: any) {
      setBanner({ variant: "error", message: e?.message || "Delete failed" });
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
      const json = await parseJsonOrThrow(res);
      await fetchUsers();
      setBanner({ variant: "success", message: "User suspended successfully." });
    } catch (e: any) {
      setBanner({ variant: "error", message: e?.message || "Suspend failed" });
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
      const json = await parseJsonOrThrow(res);
      await fetchUsers();
      setBanner({ variant: "success", message: "User unsuspended successfully." });
    } catch (e: any) {
      setBanner({ variant: "error", message: e?.message || "Unsuspend failed" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return null;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="rounded-lg border overflow-x-auto relative">
      {banner && (
        <div className="p-3">
          <AlertBanner
            variant={banner.variant}
            message={banner.message}
            onClose={() => setBanner(null)}
          />
        </div>
      )}
      {/* Confirm Suspend Dialog */}
      <Dialog open={Boolean(confirmSuspendId)} onOpenChange={(open) => !open && setConfirmSuspendId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Suspension</DialogTitle>
            <DialogDescription>
              {confirmSuspendId
                ? `Suspend this user for ${suspendDuration[confirmSuspendId] || "10 years"}? They will not be able to sign in during this period.`
                : "Suspend this user?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="px-4 py-2 rounded-md border"
              onClick={() => setConfirmSuspendId(null)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-amber-600 text-white disabled:opacity-50"
              onClick={async () => {
                if (!confirmSuspendId) return;
                await suspendUser(confirmSuspendId);
                setConfirmSuspendId(null);
              }}
              disabled={actionLoading}
            >
              {"Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={Boolean(confirmDeleteId)} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Deleting a user will permanently remove their account and associated profile. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="px-4 py-2 rounded-md border"
              onClick={() => setConfirmDeleteId(null)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md bg-rose-600 text-white disabled:opacity-50"
              onClick={async () => {
                if (!confirmDeleteId) return;
                await deleteUser(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
              disabled={actionLoading}
            >
              {"Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 sm:p-3 text-left font-medium">Name</th>
            <th className="p-2 sm:p-3 text-left font-medium hidden sm:table-cell">Email</th>
            <th className="p-2 sm:p-3 text-left font-medium hidden lg:table-cell">Company</th>
            <th className="p-2 sm:p-3 text-left font-medium hidden md:table-cell">Phone</th>
            <th className="p-2 sm:p-3 text-left font-medium">Role</th>
            <th className="p-2 sm:p-3 text-left font-medium hidden sm:table-cell">Status</th>
            <th className="p-2 sm:p-3 text-left font-medium hidden lg:table-cell">Created</th>
            <th className="p-2 sm:p-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const name = u.profile?.full_name || u.email?.split("@")[0] || "";
            const role = u.profile?.role || u.user_metadata?.role || "client";
            const suspended = u.profile?.suspended || Boolean(u.banned_until);
            const created = u.created_at ? new Date(u.created_at).toLocaleDateString() : "";
            return (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="p-2 sm:p-3">
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-gray-500 sm:hidden">{u.email}</div>
                </td>
                <td className="p-2 sm:p-3 hidden sm:table-cell">{u.email}</td>
                <td className="p-2 sm:p-3 hidden lg:table-cell">{u.profile?.company_name || "-"}</td>
                <td className="p-2 sm:p-3 hidden md:table-cell">{u.profile?.phone || "-"}</td>
                <td className="p-2 sm:p-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {role}
                  </span>
                </td>
                <td className="p-2 sm:p-3 hidden sm:table-cell">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {suspended ? "Suspended" : "Active"}
                  </span>
                </td>
                <td className="p-2 sm:p-3 hidden lg:table-cell text-sm text-gray-600">{created}</td>
                <td className="p-2 sm:p-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {suspended ? (
                      <button
                        className="px-3 py-1 rounded bg-green-600 text-white text-xs sm:text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        onClick={() => unsuspendUser(u.id)}
                        disabled={actionLoading}
                      >
                        Unsuspend
                      </button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          className="border rounded px-2 py-1 text-gray-800 text-xs sm:text-sm"
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
                          className="px-3 py-1 rounded bg-amber-600 text-white text-xs sm:text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                          onClick={() => setConfirmSuspendId(u.id)}
                          disabled={actionLoading}
                        >
                          Suspend
                        </button>
                      </div>
                    )}
                    <button
                      className="px-3 py-1 rounded bg-rose-600 text-white text-xs sm:text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50"
                      onClick={() => setConfirmDeleteId(u.id)}
                      disabled={actionLoading}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}