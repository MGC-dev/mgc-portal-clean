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

export default function AdminClientUploadsPage() {
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
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold tracking-widest text-[#264f5e]/60 uppercase mb-1">
          Admin Portal
        </p>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1a3340] tracking-tight">Client Uploads</h1>
            <p className="text-sm text-[#6b8a96]">Browse documents submitted via the client portal</p>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="rounded-2xl border border-[#e8eef1] bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1 relative">
            <Search className="w-4 h-4 text-[#6b8a96] absolute left-3" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} 
                   className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[#e8eef1] bg-white text-[#1a3340] placeholder:text-[#9bb5be] focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10 shadow-sm" 
                   placeholder="Search clients or documents" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={collapseAll} className="px-3 py-2 rounded-xl border border-[#e8eef1] text-[#6b8a96] hover:bg-gray-50 text-sm font-medium inline-flex items-center gap-1.5 transition-colors">
              <ChevronUp className="w-4 h-4" /> Collapse all
            </button>
            <button onClick={expandAll} className="px-3 py-2 rounded-xl border border-[#e8eef1] text-[#6b8a96] hover:bg-gray-50 text-sm font-medium inline-flex items-center gap-1.5 transition-colors">
              <ChevronDown className="w-4 h-4" /> Expand all
            </button>
            <div className="h-6 w-px bg-[#e8eef1] mx-1" />
            <span className="text-xs font-semibold text-[#264f5e] uppercase tracking-wide">Sort:</span>
            <button onClick={() => setSortBy("name")} className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${sortBy === "name" ? "bg-[#264f5e]/10 text-[#264f5e]" : "text-[#6b8a96] hover:bg-gray-50"}`}>
              <SortAsc className="w-3.5 h-3.5" /> Name
            </button>
            <button onClick={() => setSortBy("date")} className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors ${sortBy === "date" ? "bg-[#264f5e]/10 text-[#264f5e]" : "text-[#6b8a96] hover:bg-gray-50"}`}>
              <SortDesc className="w-3.5 h-3.5" /> Date
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <section className="lg:col-span-2 rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-[#e8eef1] flex items-center justify-between bg-white shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-[#1a3340]">Submitted Documents</h2>
              {!loading && docs.length > 0 && <p className="text-xs text-[#6b8a96] mt-0.5">Total: {docs.length}</p>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-[#f6f9fb]">
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="rounded-xl border border-[#e8eef1] bg-white p-4 animate-pulse">
                    <div className="h-4 w-48 bg-gray-100 rounded mb-2" />
                    <div className="h-3 w-32 bg-gray-50 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-sm text-red-500 text-center py-10">{error}</div>
            ) : groupByClient(docs).length === 0 ? (
              <div className="text-sm text-[#6b8a96] text-center py-10">No documents submitted.</div>
            ) : (
              <div className="space-y-4">
                {groupByClient(docs).map((group) => {
                  const collapsed = !!collapsedGroups[group.label];
                  return (
                    <div key={group.label} className="rounded-xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between border-b border-transparent data-[collapsed=false]:border-[#e8eef1]" data-collapsed={collapsed}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#264f5e]/10 text-[#264f5e] flex items-center justify-center text-xs font-bold uppercase shrink-0">
                            {String(group.label).charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-[#1a3340] truncate">{group.label}</div>
                            <div className="text-xs text-[#6b8a96]">{group.items.length} document{group.items.length > 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <button onClick={() => toggleGroup(group.label)} className="p-1.5 text-[#6b8a96] hover:text-[#264f5e] hover:bg-[#264f5e]/10 rounded-lg transition-colors shrink-0">
                          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </button>
                      </div>
                      {!collapsed && (
                        <ul className="divide-y divide-[#e8eef1]">
                          {group.items.map((d) => (
                            <li key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-gray-50/50 transition-colors">
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-[#1a3340] truncate">{d.title}</div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide mt-1 text-[#264f5e]">{d.status || "submitted"}</div>
                                {d.created_at && (
                                  <div className="text-xs text-[#9bb5be] mt-0.5">Uploaded: {formatDateTime(d.created_at)}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => selectForPreview(d)} className="px-3 py-1.5 text-xs rounded-lg border border-[#e8eef1] text-[#264f5e] font-medium hover:bg-gray-50 transition-colors">Preview</button>
                                <button onClick={() => openDoc(d.id)} className="px-3 py-1.5 text-xs rounded-lg bg-[#264f5e]/10 text-[#264f5e] font-medium hover:bg-[#264f5e]/20 transition-colors">Open</button>
                                <button
                                  onClick={() => deleteDoc(d.id)}
                                  disabled={deletingId === d.id}
                                  className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-500 font-medium border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50"
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
          </div>
        </section>

        {/* Preview Panel */}
        <aside className="rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-[#e8eef1] flex items-center justify-between shrink-0">
            <h2 className="text-sm font-semibold text-[#1a3340]">Quick Preview</h2>
            {selected && (
              <button className="text-[11px] font-semibold text-[#6b8a96] uppercase hover:text-[#264f5e]" onClick={() => { setSelected(null); setPreviewUrl(null); }}>Clear</button>
            )}
          </div>
          <div className="flex-1 p-4 bg-[#f6f9fb] overflow-y-auto">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-[#6b8a96]">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-50"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                <p className="text-sm font-medium">Select a file to preview</p>
              </div>
            ) : previewUrl ? (
              <div className="flex flex-col h-full gap-4">
                <div className="flex-1 rounded-xl border border-[#e8eef1] bg-white overflow-hidden shadow-sm">
                  <iframe src={previewUrl} className="w-full h-full border-0" />
                </div>
                <div className="shrink-0 bg-white p-4 rounded-xl border border-[#e8eef1]">
                  <div className="font-semibold text-sm text-[#1a3340] mb-1">{selected.title}</div>
                  {selected.description && <div className="text-xs text-[#6b8a96] leading-relaxed">{selected.description}</div>}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[#6b8a96]">
                <div className="flex items-center gap-2 text-sm font-medium text-[#264f5e]">
                  <span className="h-4 w-4 border-2 border-[#264f5e]/30 border-t-[#264f5e] rounded-full animate-spin" />
                  Generating preview…
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}