"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Ticket = {
  id: string;
  subject: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed" | string;
  created_at: string;
  user?: { id?: string; email?: string; full_name?: string };
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [search, setSearch] = useState("");

  async function fetchTickets() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support/list", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load tickets");
      setTickets(json?.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/support/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");
      await fetchTickets();
    } catch (e: any) {
      alert(e?.message || "Failed to update status");
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  const statusColor = (s: string) =>
    s === "closed"
      ? "bg-green-100 text-green-700"
      : "bg-amber-100 text-amber-700";

  const openCount = tickets.filter((t) => t.status === "open").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;
  const filteredTickets = tickets.filter((t) => {
    const matchesFilter =
      filter === "all" || t.status === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      t.subject?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.user?.email?.toLowerCase().includes(q) ||
      t.user?.full_name?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin • Support Tickets</h1>
            <p className="text-sm text-gray-600 mt-1">View incoming tickets and update their status.</p>
          </div>
          <Link href="/admin" className="text-blue-600 hover:underline">Back to Admin</Link>
        </header>

        {error && (
          <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700">{error}</div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              className={`px-3 py-2 text-sm ${filter === "all" ? "bg-gray-100" : "bg-white"}`}
              onClick={() => setFilter("all")}
            >
              All ({tickets.length})
            </button>
            <button
              className={`px-3 py-2 text-sm border-l border-gray-200 ${filter === "open" ? "bg-gray-100" : "bg-white"}`}
              onClick={() => setFilter("open")}
            >
              Open ({openCount})
            </button>
            <button
              className={`px-3 py-2 text-sm border-l border-gray-200 ${filter === "closed" ? "bg-gray-100" : "bg-white"}`}
              onClick={() => setFilter("closed")}
            >
              Closed ({closedCount})
            </button>
          </div>
          <input
            type="text"
            placeholder="Search by subject, message, user, or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="p-4 rounded border border-gray-200 text-gray-600">
            {loading ? "Loading tickets..." : "No tickets found or table missing."}
          </div>
        ) : (
          <section className="space-y-3">
            {filteredTickets.map((t) => (
              <div key={t.id} className="p-4 rounded border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900">{t.subject || "(No subject)"}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-mono">#{t.id.slice(0, 8)}</span> • {new Date(t.created_at).toLocaleString()} • {t.user?.email || t.user?.full_name || t.user?.id || "Unknown user"}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded font-medium uppercase tracking-wide ${statusColor(t.status)}`}>
                    {t.status}
                  </span>
                </div>
                {t.description && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-700 font-medium">Message</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded p-3">
                      {t.description}
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <label className="text-sm text-gray-700 mr-2">Update status:</label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                  >
                    <option value="open">open</option>
                    <option value="closed">closed</option>
                  </select>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}