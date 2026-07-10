"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, FileText, Download, Folder, File as FileIcon, Image as ImageIcon, Loader2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

type ClientDoc = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  created_at?: string;
};

type WorkDriveFile = {
  id: string;
  name: string;
  extn: string;
  size: number;
  created_time: number;
  modified_time: number;
  type: string;
  permalink: string;
  is_folder?: boolean;
};

export default function ClientDocumentsPage() {
  const [activeTab, setActiveTab] = useState<"workdrive" | "upload">("workdrive");
  
  // WorkDrive State
  const [wdFiles, setWdFiles] = useState<WorkDriveFile[]>([]);
  const [wdLoading, setWdLoading] = useState(true);
  const [wdError, setWdError] = useState<string | null>(null);
  
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string, name: string}[]>([]);

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
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkDriveFiles();
    fetchUploadedDocs();
  }, []);

  async function fetchWorkDriveFiles(folderId?: string, folderName?: string, isBack?: boolean) {
    setWdLoading(true);
    setWdError(null);
    try {
      const url = folderId ? `/api/workdrive/files?folderId=${folderId}` : "/api/workdrive/files";
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || "Failed to load files");
      setWdFiles((json?.files || []) as WorkDriveFile[]);
      setCurrentFolderId(json?.folderId);
      if (!rootFolderId && json?.rootFolderId) {
        setRootFolderId(json?.rootFolderId);
      }
      
      if (folderId && folderName && !isBack) {
        setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
      } else if (!folderId) {
        setFolderHistory([]);
      }
    } catch (e: any) {
      setWdError(e?.message || "Failed to load files");
    } finally {
      setWdLoading(false);
    }
  }

  function handleFolderClick(f: WorkDriveFile) {
    fetchWorkDriveFiles(f.id, f.name);
  }

  function handleBackClick() {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      newHistory.pop(); // remove current
      setFolderHistory(newHistory);
      
      if (newHistory.length > 0) {
        const prevFolder = newHistory[newHistory.length - 1];
        fetchWorkDriveFiles(prevFolder.id, prevFolder.name, true);
      } else {
        // back to root
        fetchWorkDriveFiles(rootFolderId || undefined, undefined, true);
      }
    }
  }

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

  function getFileIcon(extn: string, isFolder?: boolean) {
    if (isFolder) return <Folder className="w-8 h-8 text-[#264f5e] fill-[#264f5e]/10" />;
    const ext = (extn || "").toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext)) return <ImageIcon className="w-8 h-8 text-[#264f5e]" />;
    if (ext === "pdf") return <FileText className="w-8 h-8 text-red-500" />;
    if (["doc", "docx"].includes(ext)) return <FileText className="w-8 h-8 text-[#264f5e]" />;
    return <FileIcon className="w-8 h-8 text-gray-500" />;
  }

  function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  return (
    <div className="overflow-y-auto p-6 lg:p-8">
      <div className="space-y-6">
            <header>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Folder className="w-8 h-8 text-[#264f5e]" />
                My Documents
              </h1>
              <p className="text-gray-600 mt-2">
                Access files shared with you by our team, or upload documents securely.
              </p>
            </header>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100/80 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab("workdrive")}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "workdrive"
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                }`}
              >
                Shared with me
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "upload"
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
                }`}
              >
                Upload to Admin
              </button>
            </div>

            {/* WorkDrive Tab */}
            {activeTab === "workdrive" && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">
                      {folderHistory.length > 0 ? folderHistory[folderHistory.length - 1].name : "Shared Files"}
                    </h2>
                    {folderHistory.length > 0 && (
                      <button 
                        onClick={handleBackClick}
                        className="ml-4 text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      >
                        ← Back
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {currentFolderId && (
                      <a
                        href={`/api/workdrive/download?fileId=${currentFolderId}&isFolder=true&folderId=${folderHistory.length > 1 ? folderHistory[folderHistory.length - 2].id : rootFolderId || ''}`}
                        className="text-sm flex items-center gap-1.5 text-[#264f5e] hover:text-[#1f424e] font-medium bg-[#f5f5f7] hover:bg-[#e8e8ed] px-3 py-1.5 rounded-lg transition-colors"
                        download
                      >
                        <Download className="w-4 h-4" />
                        Download ZIP
                      </a>
                    )}
                    <button 
                      onClick={() => {
                        if (folderHistory.length > 0) {
                          const current = folderHistory[folderHistory.length - 1];
                          fetchWorkDriveFiles(current.id, current.name, true);
                        } else {
                          fetchWorkDriveFiles();
                        }
                      }}
                      className="text-sm text-[#264f5e] hover:text-[#1f424e] font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {wdLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#264f5e]" />
                    <p>Loading your documents...</p>
                  </div>
                ) : wdError ? (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-sm">
                    {wdError}
                  </div>
                ) : wdFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500 border-2 border-dashed rounded-xl">
                    <Folder className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="font-medium text-gray-900">No files shared yet</p>
                    <p className="text-sm mt-1">Documents shared by our team will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wdFiles.map((f) => (
                      <div key={f.id} className="group relative rounded-2xl border border-gray-100 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.04)] transition-all bg-white flex flex-col h-full">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="shrink-0 bg-[#f5f5f7] p-2 rounded-xl">
                            {getFileIcon(f.extn, f.is_folder)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900 truncate" title={f.name}>
                              {f.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">
                              {f.is_folder ? "Folder" : `${f.extn} • ${formatBytes(f.size)}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-auto pt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {f.modified_time ? format(new Date(f.modified_time), "MMM d, yyyy") : ""}
                          </span>
                          <div className="flex items-center gap-2">
                            {f.is_folder ? (
                              <div className="flex items-center gap-2 w-full">
                                <button
                                  onClick={() => handleFolderClick(f)}
                                  className="inline-flex flex-1 justify-center items-center gap-1.5 px-3 py-2 bg-[#f5f5f7] text-[#1d1d1f] text-sm font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
                                >
                                  Open Folder
                                </button>
                                <a
                                  href={`/api/workdrive/download?fileId=${f.id}&isFolder=true&folderId=${currentFolderId || ''}`}
                                  className="inline-flex items-center justify-center p-2 bg-white border border-gray-200 text-[#1d1d1f] rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                                  title="Download Folder ZIP"
                                  download
                                >
                                  <Download className="w-4.5 h-4.5" />
                                </a>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setViewingFileId(f.id); setViewingFileName(f.name); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f5f5f7] text-[#1d1d1f] text-sm font-medium rounded-xl hover:bg-[#e8e8ed] transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                                <a
                                  href={`/api/workdrive/download?fileId=${f.id}&folderId=${currentFolderId || ''}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#264f5e] text-white text-sm font-medium rounded-xl hover:bg-[#1f424e] transition-colors shadow-sm"
                                  download
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === "upload" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
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

                <section className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
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
                    <ul className="space-y-3">
                      {docs.map((d) => (
                        <li key={d.id} className="flex items-center justify-between border rounded-xl p-4 bg-gray-50 hover:bg-white transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-white p-2 rounded-lg border shadow-sm shrink-0">
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

            <Dialog open={!!viewingFileId} onOpenChange={(open) => !open && setViewingFileId(null)}>
              <DialogContent className="sm:max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 py-4 border-b bg-gray-50/50 shrink-0">
                  <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {viewingFileName || "Document Viewer"}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 bg-gray-100/50 relative">
                  {viewingFileId && (
                    <iframe
                      src={`/api/workdrive/download?fileId=${viewingFileId}&view=true&folderId=${currentFolderId || ''}`}
                      className="w-full h-full border-0 absolute inset-0"
                      title="Document Viewer"
                    />
                  )}
                </div>
              </DialogContent>
            </Dialog>

          </div>
    </div>
  );
}