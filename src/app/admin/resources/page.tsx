"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Resource } from "@/lib/resources";
import { authedFetch } from "@/lib/auth-fetch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function AdminResourcesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"document" | "video">("document");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "validating" | "uploading" | "saving">("idle");

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clientUserId, setClientUserId] = useState<string>("");
  const [clients, setClients] = useState<{ id: string; label: string }[]>([]);

  function formatDateTime(value?: string | null) {
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authedFetch("/api/resources", {
          headers: { accept: "application/json" },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load resources");
        setResources((json?.resources || []) as Resource[]);
        // Load clients for assignment selector
        const usersRes = await authedFetch("/api/admin/users?perPage=200", { headers: { accept: "application/json" } });
        const usersJson = await usersRes.json();
        if (usersRes.ok && Array.isArray(usersJson?.users)) {
          const clientOptions = (usersJson.users as any[])
            .filter((u: any) => (u?.profile?.role || "") === "client")
            .map((u: any) => ({
              id: u.id,
              label: u?.profile?.full_name || u?.email || u.id,
            }))
            .sort((a: any, b: any) => String(a.label).localeCompare(String(b.label)));
          setClients(clientOptions);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load resources");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setPhase("validating");
    setError(null);
    try {
      if (!title) throw new Error("Title is required");
      if (!file && !externalUrl) throw new Error("Provide a file or external URL");
      if (!clientUserId) throw new Error("Assign to a client");
      setPhase(file ? "uploading" : "saving");
      const formData = new FormData();
      formData.append("title", title);
      if (description) formData.append("description", description);
      formData.append("category", category);
      if (file) formData.append("file", file);
      if (externalUrl) formData.append("external_url", externalUrl);
      formData.append("client_user_id", clientUserId);

      const res = await authedFetch("/api/admin/resources/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      setPhase("idle");
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      const data = json?.data;
      if (data) {
        setResources((prev) => [data, ...prev]);
        setTitle("");
        setDescription("");
        setCategory("document");
        setFile(null);
        setExternalUrl("");
        setClientUserId("");
      }
    } catch (err: any) {
      console.error("Upload error", err);
      setError(err.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmId(id);
  }

  async function confirmDelete() {
    if (!confirmId) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/admin/resources/${confirmId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      setResources((prev) => prev.filter((r) => r.id !== confirmId));
      setConfirmId(null);
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <header>
        <p className="text-xs font-semibold tracking-widest text-[#264f5e]/60 uppercase mb-1">Admin Portal</p>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1a3340] tracking-tight">Resource Library</h1>
            <p className="text-sm text-[#6b8a96]">Upload documents and videos for clients</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Upload form */}
      <section className="rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e8eef1]">
          <h2 className="text-sm font-semibold text-[#1a3340]">Upload Resource</h2>
          <p className="text-xs text-[#6b8a96] mt-0.5">Upload documents or videos and assign them to a specific client.</p>
        </div>
        <div className="p-6">
          {phase !== "idle" && (
            <div className="mb-4 flex items-center gap-2 text-sm text-[#264f5e] font-medium">
              <span className="h-3.5 w-3.5 border-2 border-[#264f5e]/30 border-t-[#264f5e] rounded-full animate-spin" />
              {phase === "validating" ? "Validating…" : phase === "uploading" ? "Uploading file…" : "Saving…"}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] placeholder:text-[#9bb5be] focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10"
                placeholder="Resource title" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] bg-white focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10">
                <option value="document">Document</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">Assign to Client</label>
              <select value={clientUserId} onChange={(e) => setClientUserId(e.target.value)}
                className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] bg-white focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10">
                <option value="">Select a client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <p className="text-[11px] text-[#6b8a96] mt-1">Visible only to the selected client.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] placeholder:text-[#9bb5be] focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">File Upload</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#264f5e]/10 file:text-[#264f5e] file:text-xs file:font-semibold hover:file:bg-[#264f5e]/20" />
              <p className="text-[11px] text-[#6b8a96] mt-1">PDF, DOCX, XLSX, or MP4</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">External URL (optional)</label>
              <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)}
                className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] placeholder:text-[#9bb5be] focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10"
                placeholder="https://…" />
            </div>
            <div className="md:col-span-2">
              <button disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#264f5e] text-white text-sm font-semibold hover:bg-[#1f3f4c] transition-colors disabled:opacity-50 shadow-sm">
                {submitting
                  ? <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading…</>
                  : "Upload Resource"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Resources list */}
      <section className="rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e8eef1]">
          <h2 className="text-sm font-semibold text-[#1a3340]">Existing Resources</h2>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="rounded-xl border border-[#e8eef1] p-4 animate-pulse flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-gray-100 rounded-lg" />
                    <div className="h-3 w-24 bg-gray-50 rounded-full" />
                  </div>
                  <div className="h-7 w-20 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-10 text-[#6b8a96] text-sm">No resources uploaded yet.</div>
          ) : (
            <ul className="space-y-2">
              {resources.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl border border-[#e8eef1] bg-[#f6f9fb] px-4 py-3 hover:border-[#264f5e]/20 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-[#1a3340]">{r.title}</p>
                    <p className="text-xs text-[#6b8a96] mt-0.5">
                      {r.category || "uncategorized"}
                      {r.client_user_id && ` · ${clients.find((c) => c.id === (r as any).client_user_id)?.label || (r as any).client_user_id}`}
                    </p>
                    {r.created_at && <p className="text-[11px] text-[#9bb5be] mt-0.5">{formatDateTime(r.created_at)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs rounded-lg bg-[#264f5e]/10 text-[#264f5e] font-medium hover:bg-[#264f5e]/20 transition-colors">Open</a>
                    )}
                    <button onClick={() => handleDelete(r.id)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-500 border border-red-200 font-medium hover:bg-red-100 transition-colors">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Dialog open={!!confirmId} onOpenChange={(open) => !open && !deleting && setConfirmId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>This action permanently deletes the resource and its file from storage.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button className="px-4 py-2 rounded-xl border border-[#e8eef1] text-sm font-medium text-[#264f5e] hover:bg-gray-50"
              onClick={() => setConfirmId(null)} disabled={deleting}>Cancel</button>
            <button className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-600 transition-colors inline-flex items-center gap-2"
              onClick={confirmDelete} disabled={deleting}>
              {deleting ? <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</> : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
