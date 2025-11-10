"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminDoc = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  created_at?: string;
  client_user_id: string;
  file_path: string;
  client_profile?: { email?: string | null; full_name?: string | null } | null;
};

export default function AdminClientDocumentsPage() {
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function formatDateTime(value?: string) {
    if (!value) return "";
    try {
      const d = new Date(value);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return String(value);
    }
  }

  function groupByClient(items: AdminDoc[]) {
    const groups = new Map<string, { label: string; items: AdminDoc[] }>();
    for (const it of items) {
      const label = it.client_profile?.full_name || it.client_profile?.email || it.client_user_id;
      const key = label || it.client_user_id;
      if (!groups.has(key)) groups.set(key, { label: label || it.client_user_id, items: [] });
      groups.get(key)!.items.push(it);
    }
    // Sort items in each group by created_at desc
    for (const g of groups.values()) {
      g.items.sort((a, b) => (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime()));
    }
    // Return groups sorted by label
    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  async function loadDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/client-documents", { headers: { accept: "application/json" } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load documents");
      setDocs((json?.documents || []) as AdminDoc[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function openDoc(id: string) {
    try {
      const res = await fetch(`/api/client-documents/${id}/url`, { headers: { accept: "application/json" } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not open document");
      const url = json?.url as string;
      if (url) window.open(url, "_blank");
    } catch (e) {}
  }

  async function deleteDoc(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/client-documents/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      await loadDocs();
    } catch (e) {
      // noop, could show toast
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin • Client Documents</h1>
          <Link href="/admin" className="text-blue-600 hover:underline">Back to Admin</Link>
        </header>

        <section className="rounded-lg border p-6">

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Submitted Documents</h2>
            {!loading && docs.length > 0 && (
              <div className="text-sm text-gray-600">Total: {docs.length}</div>
            )}
          </div>

          {loading ? (
            <div className="mt-2 text-sm text-gray-600">Loading...</div>
          ) : error ? (
            <div className="mt-2 text-sm text-red-600">{error}</div>
          ) : docs.length === 0 ? (
            <div className="mt-2 text-sm text-gray-600">No documents submitted.</div>
          ) : (
            <div className="space-y-6 mt-4">
              {groupByClient(docs).map((group) => (
                <div key={group.label} className="rounded-md border">
                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div className="font-semibold">{group.label}</div>
                    <div className="text-sm text-gray-600">{group.items.length} document{group.items.length > 1 ? 's' : ''}</div>
                  </div>
                  <ul className="p-3 space-y-2">
                    {group.items.map((d) => (
                      <li key={d.id} className="flex items-center justify-between border rounded-md p-3">
                        <div>
                          <div className="font-medium">{d.title}</div>
                          <div className="text-xs text-gray-600">{d.status || "submitted"}</div>
                          {d.created_at && (
                            <div className="text-xs text-gray-500">Uploaded: {formatDateTime(d.created_at)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => openDoc(d.id)} className="text-blue-600 hover:underline">Open</button>
                          <button
                            onClick={() => deleteDoc(d.id)}
                            disabled={deletingId === d.id}
                            className="text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deletingId === d.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}