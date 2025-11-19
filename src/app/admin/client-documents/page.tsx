"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronUp, SortAsc, SortDesc } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date">("name");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<AdminDoc | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    let arr = Array.from(groups.values());
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr
        .map((g) => ({
          label: g.label,
          items: g.items.filter((d) => d.title.toLowerCase().includes(q) || (d.client_profile?.full_name || "").toLowerCase().includes(q)),
        }))
        .filter((g) => g.items.length > 0 || g.label.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      arr = arr.map((g) => ({ label: g.label, items: g.items.filter((d) => (d.status || "submitted") === statusFilter) }));
    }
    arr = arr.sort((a, b) => a.label.localeCompare(b.label));
    if (sortBy === "date") {
      arr = arr.map((g) => ({
        label: g.label,
        items: [...g.items].sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }),
      }));
    } else if (sortBy === "name") {
      arr = arr.map((g) => ({ label: g.label, items: [...g.items].sort((a, b) => String(a.title).localeCompare(String(b.title))) }));
    }
    return arr;
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

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }
  function collapseAll() {
    const next: Record<string, boolean> = {};
    groupByClient(docs).forEach((g) => { next[g.label] = true; });
    setCollapsedGroups(next);
  }
  function expandAll() {
    const next: Record<string, boolean> = {};
    groupByClient(docs).forEach((g) => { next[g.label] = false; });
    setCollapsedGroups(next);
  }
  async function selectForPreview(doc: AdminDoc) {
    setSelected(doc);
    setPreviewUrl(null);
    try {
      const res = await fetch(`/api/client-documents/${doc.id}/url`, { headers: { accept: "application/json" } });
      const json = await res.json();
      if (res.ok && json?.url) setPreviewUrl(json.url as string);
    } catch {}
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
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin • Client Documents</h1>
          <Link href="/admin" className="text-blue-600 hover:underline">Back to Admin</Link>
        </header>

        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-gray-100 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="bg-transparent flex-1 outline-none text-sm" placeholder="Search clients or documents" />
              </div>
              <button onClick={collapseAll} className="px-3 py-2 rounded-md border text-sm inline-flex items-center gap-1">
                <ChevronUp className="w-4 h-4" /> Collapse all
              </button>
              <button onClick={expandAll} className="px-3 py-2 rounded-md border text-sm inline-flex items-center gap-1">
                <ChevronDown className="w-4 h-4" /> Expand all
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-500">Sort:</span>
                <button onClick={() => setSortBy("name")} className={`px-3 py-1.5 rounded-md text-xs border inline-flex items-center gap-1 ${sortBy === "name" ? "bg-gray-200" : "bg-white"}`}>
                  <SortAsc className="w-4 h-4" /> Name
                </button>
                <button onClick={() => setSortBy("date")} className={`px-3 py-1.5 rounded-md text-xs border inline-flex items-center gap-1 ${sortBy === "date" ? "bg-gray-200" : "bg-white"}`}>
                  <SortDesc className="w-4 h-4" /> Date
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Submitted Documents</h2>
              {!loading && docs.length > 0 && (
                <div className="text-sm text-gray-600">Total: {docs.length}</div>
              )}
            </div>

            {loading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : groupByClient(docs).length === 0 ? (
              <div className="text-sm text-gray-600">No documents submitted.</div>
            ) : (
              <div className="space-y-4">
                {groupByClient(docs).map((group) => {
                  const collapsed = !!collapsedGroups[group.label];
                  return (
                    <div key={group.label} className="rounded-xl border bg-white shadow-sm">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                            {String(group.label).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{group.label}</div>
                            <div className="text-xs text-gray-600">{group.items.length} document{group.items.length > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <button onClick={() => toggleGroup(group.label)} className="px-3 py-1.5 text-xs rounded-md border inline-flex items-center gap-1">
                          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          {collapsed ? "Expand" : "Collapse"}
                        </button>
                      </div>
                      {!collapsed && (
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
                              <div className="flex items-center gap-2">
                                <button onClick={() => selectForPreview(d)} className="px-3 py-1.5 text-xs rounded-md border">Preview</button>
                                <button onClick={() => openDoc(d.id)} className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 text-white">Open</button>
                                <button
                                  onClick={() => deleteDoc(d.id)}
                                  disabled={deletingId === d.id}
                                  className="px-3 py-1.5 text-xs rounded-md border text-red-600 disabled:opacity-50"
                                >
                                  {deletingId === d.id ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="rounded-lg border p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Quick preview</div>
              {selected && (
                <button className="text-xs text-gray-500" onClick={() => { setSelected(null); setPreviewUrl(null); }}>Clear</button>
              )}
            </div>
            {!selected ? (
              <p className="mt-2 text-sm text-gray-600">Select a file to view details</p>
            ) : previewUrl ? (
              <div className="mt-3">
                <iframe src={previewUrl} className="w-full h-[300px] rounded-md border" />
                <div className="mt-2 text-sm">
                  <div className="font-medium">{selected.title}</div>
                  {selected.description && <div className="text-gray-600">{selected.description}</div>}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">Generating preview…</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}