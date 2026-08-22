"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { Upload, FileText, Download, Folder, Loader2, ExternalLink, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import FileBrowser, { kindLabel, formatBytes, type WorkDriveFile } from "./FileBrowser";
import { ItemGlyph } from "./FileGlyphs";

type ClientDoc = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  created_at?: string;
};

export default function ClientDocumentsPage() {
  const [activeTab, setActiveTab] = useState<"workdrive" | "upload">("workdrive");
  
  // Upload State
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
  
  // Viewer State
  const [viewingFile, setViewingFile] = useState<WorkDriveFile | null>(null);
  // The folder the file was reported from — the download API verifies a file
  // sits inside the folder it is given, so this must be the file's real parent,
  // not whatever folder happens to be open.
  const [viewingParentId, setViewingParentId] = useState<string>("");
  const [viewerLoading, setViewerLoading] = useState(false);

  // The file manager loads its own WorkDrive listing; only the upload tab's
  // documents are fetched here.
  useEffect(() => {
    fetchUploadedDocs();
  }, []);

  async function fetchUploadedDocs() {
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
  }

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
      await fetchUploadedDocs();
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
    } catch (e) {}
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

  // Formats a browser can render in an iframe. Anything else (docx, xlsx, zip)
  // would show a blank viewer, so opening those downloads instead.
  const PREVIEWABLE = ["pdf", "png", "jpg", "jpeg", "gif", "svg", "webp", "txt"];

  function fileUrl(f: WorkDriveFile, parentId: string, view = false) {
    return `/api/workdrive/download?fileId=${f.id}&folderId=${encodeURIComponent(parentId)}${
      view ? "&view=true" : ""
    }`;
  }

  /**
   * The file manager reports opens with real WorkDrive ids. Previewable types
   * go to the in-page viewer; everything else downloads, since an iframe would
   * render a blank pane for a .docx or .zip.
   */
  function handleManagerOpen(
    file: { id: string; name: string; extn: string; size: number },
    parentWdId: string
  ) {
    const entry: WorkDriveFile = {
      id: file.id,
      name: file.name,
      extn: file.extn,
      size: file.size,
      created_time: 0,
      modified_time: 0,
      type: "file",
      permalink: "",
      is_folder: false,
    };
    openItem(entry, parentWdId);
  }

  function openItem(f: WorkDriveFile, parentId: string) {
    // Folder navigation is handled inside the file manager; only files arrive here.
    if (PREVIEWABLE.includes((f.extn || "").toLowerCase())) {
      setViewingFile(f);
      setViewingParentId(parentId);
      setViewerLoading(true);
    } else {
      window.location.href = fileUrl(f, parentId);
    }
  }

  /** Segmented control; lives in the file browser toolbar beside the search. */
  const TabSwitch = () => (
    <div className="flex items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5 shrink-0">
      {(["workdrive", "upload"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full outline-none focus:outline-none transition-all duration-200 ease-out ${
            activeTab === tab ? "bg-white text-[#1d1d1f]" : "text-gray-500 hover:text-[#1d1d1f]"
          }`}
        >
          {tab === "workdrive" ? "Shared with me" : "Upload"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="overflow-y-auto px-6 lg:px-8 pb-8">
      <div className="space-y-6">
            <header>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Folder className="w-6 h-6 text-[#264f5e]" />
                My Documents
                {/* The blurb lives in the tooltip so the heading stays compact. */}
                <span className="relative inline-flex group">
                  <Info
                    className="w-[18px] h-[18px] text-gray-400 hover:text-gray-600 cursor-help transition-colors"
                    tabIndex={0}
                    aria-label="Access files shared with you by our team, or upload documents securely."
                  />
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg bg-[#1d1d1f] px-3 py-2 text-[12px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    Access files shared with you by our team, or upload documents securely.
                  </span>
                </span>
              </h1>
            </header>

            {/* WorkDrive Tab — browse and download files MG shared with you. */}
            {activeTab === "workdrive" && (
              <div className="animate-in fade-in duration-200">
                <FileBrowser onOpenFile={handleManagerOpen} toolbarExtra={<TabSwitch />} />
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === "upload" && (
              <div className="animate-in fade-in duration-200">
                <div className="flex justify-start pt-1 pb-3">
                  <TabSwitch />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                    <Upload className="w-5 h-5 text-[#264f5e]" />
                    Upload a document
                  </h2>
                  {message && (
                    <div className="mb-6 text-sm">
                      <span className="px-4 py-3 block rounded-lg border bg-green-50 text-green-800 border-green-200">
                        {message}
                      </span>
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., ID Document"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description (optional)</label>
                      <textarea
                        className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Short note for admin"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1 block">File</Label>
                      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-sm mb-3">
                          <Upload className="w-5 h-5 text-[#264f5e]" />
                        </div>
                        <div className="text-sm text-gray-700 font-medium">
                          {file ? file.name : "Click to select a file"}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Accepted formats: PDF, DOCX, PNG, JPG. Max 10MB.
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#264f5e] text-white font-medium rounded-[10px] hover:bg-[#1f424e] disabled:opacity-50 transition-colors"
                      >
                        {submitting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                        ) : "Upload Document"}
                      </button>
                    </div>
                  </form>
                </section>

                <section>
                  <h2 className="text-lg font-semibold mb-6">Submitted Documents</h2>
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </div>
                  ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                  ) : docs.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">No documents uploaded yet.</div>
                  ) : (
                    <ul className="divide-y divide-black/[0.05]">
                      {docs.map((d) => (
                        <li key={d.id} className="flex items-center justify-between py-3 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">
                              <FileText className="w-5 h-5 text-[#264f5e]" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{d.title}</div>
                              {d.created_at && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {format(new Date(d.created_at), "MMM d, yyyy")}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => openDoc(d.id)} 
                              className="px-3 py-1.5 text-sm font-medium text-[#264f5e] bg-[#264f5e]/10 rounded-lg hover:bg-[#264f5e]/20 transition-colors"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => { setTargetId(d.id); setConfirmOpen(true); }}
                              disabled={deletingId === d.id}
                              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {deletingId === d.id ? "..." : "Delete"}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
              </div>
            )}

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete document</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. The file and its record will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex gap-2 justify-end mt-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
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

            <Dialog
              open={!!viewingFile}
              onOpenChange={(open) => {
                if (!open) {
                  setViewingFile(null);
                  setViewerLoading(false);
                }
              }}
            >
              <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden gap-0 rounded-2xl">
                <DialogHeader className="px-5 py-3 border-b border-black/[0.07] bg-white shrink-0">
                  <div className="flex items-center gap-3 pr-8">
                    <span className="shrink-0">
                      <ItemGlyph ext={viewingFile?.extn || ""} size={30} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-[15px] font-semibold text-[#1d1d1f] truncate text-left">
                        {viewingFile?.name || "Document Viewer"}
                      </DialogTitle>
                      <DialogDescription className="text-[12px] text-gray-500 text-left">
                        {viewingFile
                          ? `${kindLabel(viewingFile)}${
                              viewingFile.size ? ` · ${formatBytes(viewingFile.size)}` : ""
                            }`
                          : ""}
                      </DialogDescription>
                    </div>

                    {viewingFile && (
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={fileUrl(viewingFile, viewingParentId, true)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.12] text-[13px] font-medium text-[#1d1d1f] hover:bg-black/[0.03] transition-colors"
                          title="Open in a new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">New tab</span>
                        </a>
                        <a
                          href={fileUrl(viewingFile, viewingParentId)}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#264f5e] text-white text-[13px] font-medium hover:bg-[#1f424e] transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </a>
                      </div>
                    )}
                  </div>
                </DialogHeader>
                <div className="flex-1 bg-[#f5f5f7] relative">
                  {viewingFile && (
                    <>
                      {/* The iframe paints nothing until the file has streamed,
                          which reads as a broken viewer on a large PDF. */}
                      {viewerLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-500 z-10">
                          <Loader2 className="w-7 h-7 animate-spin text-[#264f5e]" />
                          <p className="text-[13px]">Loading {viewingFile.name}…</p>
                        </div>
                      )}
                      <iframe
                        key={viewingFile.id}
                        src={fileUrl(viewingFile, viewingParentId, true)}
                        onLoad={() => setViewerLoading(false)}
                        className="w-full h-full border-0 absolute inset-0"
                        title={`Preview of ${viewingFile.name}`}
                      />
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

          </div>
    </div>
  );
}