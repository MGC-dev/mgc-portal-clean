"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { Upload, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ClientDoc = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  created_at?: string;
};

export default function ClientDocumentsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [docs, setDocs] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/client/documents", { headers: { accept: "application/json" } });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load documents");
        setDocs((json?.documents || []) as ClientDoc[]);
      } catch (e: any) {
        setError(e?.message || "Failed to load documents");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!title) {
      setMessage("Please add a title");
      return;
    }
    if (!file) {
      setMessage("Please select a file");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", title);
      if (description) form.append("description", description);
      form.append("file", file);
      const res = await fetch("/api/client/documents/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      setMessage("Document uploaded successfully");
      setTitle("");
      setDescription("");
      setFile(null);
      // Reload documents
      const listRes = await fetch("/api/client/documents", { headers: { accept: "application/json" } });
      if (listRes.ok) {
        const listJson = await listRes.json();
        setDocs((listJson?.documents || []) as ClientDoc[]);
      }
    } catch (e: any) {
      setMessage(e?.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDoc(id: string) {
    try {
      const res = await fetch(`/api/client-documents/${id}/url`, { headers: { accept: "application/json" } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Could not open document");
      const url = json?.url as string;
      if (url) {
        window.open(url, "_blank");
      }
    } catch (e) {
      // no-op, could add a toast
    }
  }

  async function deleteDoc(id: string) {
    if (!id) return;
    setDeletingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/client/documents/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setMessage("Document deleted");
    } catch (e: any) {
      setMessage(e?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6 space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              My Documents
            </h1>
          </header>

          <section className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload a document for Admin
            </h2>
            {message && (
              <div className="mt-3 text-sm">
                <span className="px-3 py-2 rounded-md border bg-gray-50">{message}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium">Title</label>
                <input
                  className="mt-1 w-full border rounded-md p-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., ID Document"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Description (optional)</label>
                <textarea
                  className="mt-1 w-full border rounded-md p-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short note for admin"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">File</Label>
                <div className="mt-2 rounded-md border border-gray-300 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700 truncate">
                      {file ? file.name : "No file selected"}
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Accepted formats: PDF, DOCX, PNG, JPG. Max 10MB.
                  </p>
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Submitted Documents</h2>
            {loading ? (
              <div className="mt-2 text-sm text-gray-600">Loading...</div>
            ) : error ? (
              <div className="mt-2 text-sm text-red-600">{error}</div>
            ) : docs.length === 0 ? (
              <div className="mt-2 text-sm text-gray-600">No documents uploaded yet.</div>
            ) : (
              <ul className="mt-4 space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-gray-600">{d.status || "submitted"}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => openDoc(d.id)} className="text-blue-600 hover:underline">Open</button>
                      <button
                        onClick={() => { setTargetId(d.id); setConfirmOpen(true); }}
                        disabled={deletingId === d.id}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deletingId === d.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {/* Confirmation Dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete document</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. The file and its record will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border rounded-md hover:bg-gray-50"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    disabled={deletingId === targetId}
                    onClick={async () => {
                      if (targetId) {
                        await deleteDoc(targetId);
                      }
                      setConfirmOpen(false);
                      setTargetId(null);
                    }}
                  >
                    {deletingId === targetId ? "Deleting..." : "Delete"}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>
        </main>
      </div>
    </div>
  );
}