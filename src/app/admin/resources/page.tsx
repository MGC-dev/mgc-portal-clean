"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listResources, type Resource } from "@/lib/resources";
import { createClient } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function AdminResourcesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"document" | "video">("document");
  const [accessLevel, setAccessLevel] = useState<"basic" | "intermediate" | "advanced">("basic");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "validating" | "uploading" | "saving">("idle");

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await listResources();
        if (error) setError(error.message);
        setResources(data || []);
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
      setPhase(file ? "uploading" : "saving");
      const formData = new FormData();
      formData.append("title", title);
      if (description) formData.append("description", description);
      formData.append("category", category);
      formData.append("access_level", accessLevel);
      if (file) formData.append("file", file);
      if (externalUrl) formData.append("external_url", externalUrl);

      const res = await fetch("/api/admin/resources/upload", {
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
        setAccessLevel("basic");
        setFile(null);
        setExternalUrl("");
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
      const res = await fetch(`/api/admin/resources/${confirmId}`, { method: "DELETE" });
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
    <div className="min-h-screen bg-white text-gray-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin • Resources</h1>
          <Link href="/admin" className="text-blue-600 hover:underline">Back to Admin</Link>
        </header>

        <section className="rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold">Upload Resource</h2>
          <p className="text-sm text-gray-600">Upload documents or videos and make them available in the client Resource Library.</p>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border rounded-md p-2" />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="mt-1 w-full border rounded-md p-2">
                <option value="document">Document</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full border rounded-md p-2" rows={3} />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium">Access Level</label>
              <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as any)} className="mt-1 w-full border rounded-md p-2">
                <option value="basic">Basic</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium">File Upload</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1 w-full" />
              <p className="text-xs text-gray-500 mt-1">PDF, DOCX, XLSX, or MP4 supported.</p>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium">External URL (optional)</label>
              <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} className="mt-1 w-full border rounded-md p-2" placeholder="https://..." />
              <p className="text-xs text-gray-500 mt-1">Provide a URL instead of a file (e.g., video link). If both are provided, the file upload will be used.</p>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
                {"Upload Resource"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border p-6">
          <h3 className="font-semibold mb-3">Existing Resources</h3>
          {loading ? (
            null
          ) : resources.length === 0 ? (
            <div className="text-sm text-gray-600">No resources uploaded yet.</div>
          ) : (
            <ul className="space-y-2">
              {resources.map((r) => (
                <li key={r.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-gray-600">{r.category || "uncategorized"} • {r.access_level}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open</a>
                    )}
                    <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Dialog open={!!confirmId} onOpenChange={(open) => !open && !deleting && setConfirmId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Resource</DialogTitle>
              <DialogDescription>
                This action permanently deletes the resource. If a file was uploaded, it will also be removed from storage.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                className="px-4 py-2 rounded-md border"
                onClick={() => setConfirmId(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {"Delete"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}