"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { authedFetch } from "@/lib/auth-fetch";
import { useAuth } from "@/hooks/use-auth";
import {
  FolderOpen,
  Folder,
  FileText,
  FileImage,
  File,
  Upload,
  Plus,
  ChevronRight,
  Home,
  RefreshCw,
  X,
  Download,
  Eye,
  FolderPlus,
  Trash2,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  profile?: { full_name?: string };
};

type WorkDriveItem = {
  id: string;
  name: string;
  type: string;
  is_folder: boolean;
  size: number;
  extn?: string;
  permalink?: string;
  created_time?: string | number;
  modified_time?: string | number;
};

function getFileIcon(item: WorkDriveItem) {
  if (item.is_folder) return <Folder className="w-7 h-7 text-blue-500" />;
  const ext = (item.extn || "").toLowerCase();
  if (["pdf"].includes(ext)) return <FileText className="w-7 h-7 text-red-400" />;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext))
    return <FileImage className="w-7 h-7 text-green-400" />;
  if (["doc", "docx"].includes(ext)) return <FileText className="w-7 h-7 text-blue-400" />;
  if (["xls", "xlsx"].includes(ext)) return <FileText className="w-7 h-7 text-emerald-500" />;
  return <File className="w-7 h-7 text-gray-400" />;
}

function isPreviewable(item: WorkDriveItem) {
  if (item.is_folder) return false;
  const ext = (item.extn || "").toLowerCase();
  return ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "txt", "csv"].includes(ext);
}

function isImage(item: WorkDriveItem) {
  const ext = (item.extn || "").toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
}

function formatSize(bytes: number) {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(ts?: string | number) {
  if (!ts) return "—";
  const date = new Date(Number(ts));
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminClientDocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);

  const [items, setItems] = useState<WorkDriveItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([]);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  // Preview state
  const [previewItem, setPreviewItem] = useState<WorkDriveItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUsers();
    } else if (!authLoading) {
      setLoadingUsers(false);
    }
  }, [authLoading, user]);

  async function fetchUsers() {
    try {
      const res = await authedFetch("/api/admin/clients", {
        headers: { accept: "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.users) {
        // Map Bigin contacts to the shape the UI expects
        const mapped = data.users.map((c: any) => ({
          id: c.id,
          email: c.Email || "",
          profile: {
            full_name: c.Full_Name || `${c.First_Name || ""} ${c.Last_Name || ""}`.trim() || c.Account_Name || "Unknown Client"
          }
        })).filter((u: User) => !!u.email); // Must have email to load WorkDrive folder
        setUsers(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (selectedUser) {
      setFolderHistory([]);
      setPreviewItem(null);
      setPreviewUrl(null);
      setItemsError(null);
      setSelectedItems([]);
      loadWorkDrive(selectedUser.email, null);
    } else {
      setItems([]);
      setItemsError(null);
      setRootFolderId(null);
      setCurrentFolderId(null);
      setSelectedItems([]);
    }
  }, [selectedUser]);

  async function loadWorkDrive(email: string, folderId: string | null) {
    setLoadingItems(true);
    setItemsError(null);
    try {
      let url = `/api/admin/workdrive/files?email=${encodeURIComponent(email)}`;
      if (folderId) url += `&folderId=${encodeURIComponent(folderId)}`;

      const res = await authedFetch(url, {
        headers: { accept: "application/json" },
      });
      const data = await res.json();

      if (res.ok) {
        setItems(data.files || []);
        setSelectedItems([]);
        if (!folderId) {
          setRootFolderId(data.rootFolderId);
          setCurrentFolderId(data.rootFolderId);
        } else {
          setCurrentFolderId(folderId);
        }
      } else {
        setItemsError(data.error || "Failed to load WorkDrive folder.");
      }
    } catch (e: any) {
      console.error(e);
      setItemsError(e.message || "Failed to load WorkDrive folder.");
    } finally {
      setLoadingItems(false);
    }
  }

  async function openPreview(item: WorkDriveItem) {
    setPreviewItem(item);
    setPreviewUrl(null);
    setPreviewLoading(true);
    const url = `/api/admin/workdrive/view?fileId=${encodeURIComponent(item.id)}&fileName=${encodeURIComponent(item.name)}&inline=true`;
    setPreviewUrl(url);
    setPreviewLoading(false);
  }

  function closePreview() {
    setPreviewItem(null);
    setPreviewUrl(null);
  }

  async function handleMassDelete() {
    if (selectedItems.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) return;

    setIsDeleting(true);
    try {
      const res = await authedFetch("/api/admin/workdrive/files/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedItems }),
      });
      if (res.ok) {
        setSelectedItems([]);
        if (selectedUser) {
          await loadWorkDrive(selectedUser.email, currentFolderId);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete items");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function createRootFolder() {
    if (!selectedUser) return;
    
    const folderName = selectedUser.profile?.full_name || selectedUser.email;
    setIsCreatingFolder(true);
    try {
      const res = await authedFetch("/api/admin/workdrive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderName,
          clientEmail: selectedUser.email,
          isRootClientFolder: true,
        }),
      });
      if (res.ok) {
        await loadWorkDrive(selectedUser.email, null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create root folder");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function createSubFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!currentFolderId || !newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const res = await authedFetch("/api/admin/workdrive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentFolderId: currentFolderId, folderName: newFolderName.trim() }),
      });
      if (res.ok) {
        setNewFolderName("");
        setShowFolderInput(false);
        await loadWorkDrive(selectedUser!.email, currentFolderId);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create folder");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingFolder(false);
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentFolderId) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderId", currentFolderId);
    try {
      const res = await authedFetch("/api/admin/workdrive/files/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await loadWorkDrive(selectedUser!.email, currentFolderId);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to upload file");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function handleFolderClick(folder: WorkDriveItem) {
    closePreview();
    setFolderHistory((h) => [...h, { id: folder.id, name: folder.name }]);
    loadWorkDrive(selectedUser!.email, folder.id);
  }

  function handleBreadcrumbClick(index: number) {
    closePreview();
    if (index === -1) {
      setFolderHistory([]);
      loadWorkDrive(selectedUser!.email, rootFolderId);
    } else {
      const newHistory = folderHistory.slice(0, index + 1);
      setFolderHistory(newHistory);
      loadWorkDrive(selectedUser!.email, newHistory[newHistory.length - 1].id);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.profile?.full_name || "").toLowerCase().includes(q)
    );
  });

  const folders = items.filter((i) => i.is_folder);
  const files = items.filter((i) => !i.is_folder);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#f6f9fb]">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 border-b border-[#e8eef1] bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-50 flex items-center justify-center">
            <FolderOpen size={18} className="text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1a3340] tracking-tight">Clients</h1>
            <p className="text-sm text-[#6b8a96]">Manage and view documents for each signed client</p>
          </div>
        </div>
        <Link href="/admin" className="text-sm font-medium text-[#264f5e] hover:bg-[#264f5e]/10 px-3 py-1.5 rounded-lg transition-colors">
          Back to Admin
        </Link>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar: Client List */}
        <div className="w-72 bg-white border-r border-[#e8eef1] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#e8eef1]">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b8a96]"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="text"
                placeholder="Search clients..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#e8eef1] rounded-xl outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10 bg-[#f6f9fb]"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-1">
            {loadingUsers ? (
              <div className="text-xs text-[#6b8a96] text-center py-6 flex flex-col items-center gap-2">
                <span className="h-4 w-4 border-2 border-[#264f5e]/30 border-t-[#264f5e] rounded-full animate-spin" />
                Loading…
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-xs text-[#6b8a96] text-center py-6">No clients found</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                    selectedUser?.id === user.id
                      ? "bg-[#264f5e] text-white shadow-sm"
                      : "hover:bg-[#f6f9fb] text-[#1a3340]"
                  }`}
                >
                  <div className={`font-semibold text-sm truncate ${selectedUser?.id === user.id ? "text-white" : "text-[#1a3340]"}`}>
                    {user.profile?.full_name || "Unnamed User"}
                  </div>
                  <div className={`text-[11px] truncate mt-0.5 ${selectedUser?.id === user.id ? "text-white/70" : "text-[#6b8a96]"}`}>{user.email}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-w-0 bg-[#f6f9fb]">
          {/* File browser */}
          <div className={`flex flex-col min-w-0 transition-all ${previewItem ? "w-1/2" : "flex-1"}`}>
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#6b8a96]">
                <div className="h-16 w-16 bg-white border border-[#e8eef1] rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <Folder className="w-8 h-8 text-[#264f5e]/40" />
                </div>
                <p className="text-sm font-medium">Select a client to view their WorkDrive folder</p>
              </div>
            ) : loadingItems && !currentFolderId ? (
              <div className="flex-1 flex items-center justify-center text-[#264f5e]">
                <span className="h-5 w-5 border-2 border-[#264f5e]/30 border-t-[#264f5e] rounded-full animate-spin mr-2" />
                <span className="text-sm font-medium">Loading WorkDrive...</span>
              </div>
            ) : itemsError ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#6b8a96] space-y-4 p-8">
                <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-sm font-medium text-center text-red-500 max-w-md">{itemsError}</p>
                <button
                  onClick={() => loadWorkDrive(selectedUser.email, currentFolderId)}
                  className="px-4 py-2 border border-[#e8eef1] text-[#264f5e] rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm mt-2"
                >
                  Retry Connection
                </button>
              </div>
            ) : !rootFolderId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#6b8a96] space-y-5 p-8">
                <div className="h-20 w-20 bg-white border border-[#e8eef1] rounded-3xl flex items-center justify-center shadow-sm">
                  <Folder className="w-10 h-10 text-[#264f5e]/40" />
                </div>
                <p className="text-sm text-center max-w-sm">
                  No WorkDrive folder has been assigned to <span className="font-semibold text-[#1a3340]">{selectedUser.profile?.full_name || selectedUser.email}</span> yet.
                </p>
                <button
                  onClick={createRootFolder}
                  disabled={isCreatingFolder}
                  className="px-5 py-2.5 bg-[#264f5e] text-white rounded-xl hover:bg-[#1f3f4c] disabled:opacity-50 font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors"
                >
                  {isCreatingFolder ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FolderPlus className="w-4 h-4" />
                  )}
                  {isCreatingFolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full bg-white m-4 rounded-2xl border border-[#e8eef1] shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="border-b border-[#e8eef1] px-4 py-3 flex items-center gap-3 bg-white">
                  {/* Breadcrumb */}
                  <div className="flex items-center text-sm font-medium text-[#6b8a96] flex-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
                    <button
                      onClick={() => handleBreadcrumbClick(-1)}
                      className="flex items-center gap-1.5 hover:text-[#264f5e] transition-colors shrink-0 bg-[#f6f9fb] px-2.5 py-1 rounded-lg"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>{selectedUser.profile?.full_name || selectedUser.email}</span>
                    </button>
                    {folderHistory.map((folder, idx) => (
                      <span key={folder.id} className="flex items-center shrink-0">
                        <ChevronRight className="w-4 h-4 mx-1.5 text-[#e8eef1]" />
                        <button
                          onClick={() => handleBreadcrumbClick(idx)}
                          className="hover:text-[#264f5e] transition-colors"
                        >
                          {folder.name}
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedItems.length > 0 && (
                      <>
                        <button
                          onClick={handleMassDelete}
                          disabled={isDeleting}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <span className="h-4 w-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete Selected ({selectedItems.length})
                        </button>
                        <div className="w-px h-5 bg-[#e8eef1] mx-1" />
                      </>
                    )}

                    <button
                      onClick={() => loadWorkDrive(selectedUser.email, currentFolderId)}
                      className="p-2 text-[#6b8a96] hover:text-[#264f5e] hover:bg-[#264f5e]/10 rounded-xl transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingItems ? "animate-spin" : ""}`} />
                    </button>

                    <div className="w-px h-5 bg-[#e8eef1] mx-1" />

                    {/* New Folder */}
                    {showFolderInput ? (
                      <form onSubmit={createSubFolder} className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Folder name"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          className="border border-[#e8eef1] rounded-xl px-3 py-1.5 text-sm outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10 w-40 text-[#1a3340]"
                        />
                        <button
                          type="submit"
                          disabled={isCreatingFolder || !newFolderName.trim()}
                          className="px-3 py-1.5 bg-[#264f5e] text-white font-semibold rounded-xl text-sm disabled:opacity-50 hover:bg-[#1f3f4c] transition-colors"
                        >
                          {isCreatingFolder ? "…" : "Create"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowFolderInput(false); setNewFolderName(""); }}
                          className="px-3 py-1.5 bg-gray-100 text-[#6b8a96] font-semibold rounded-xl text-sm hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowFolderInput(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e8eef1] rounded-xl text-sm font-semibold text-[#1a3340] hover:bg-gray-50 transition-colors"
                      >
                        <FolderPlus className="w-4 h-4 text-[#264f5e]" />
                        New Folder
                      </button>
                    )}

                    {/* Upload */}
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={uploadFile}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex items-center gap-1.5 px-3 py-1.5 bg-[#264f5e]/10 text-[#264f5e] rounded-xl text-sm font-semibold cursor-pointer hover:bg-[#264f5e]/20 transition-colors ${
                        isUploading ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      {isUploading ? (
                        <span className="h-4 w-4 border-2 border-[#264f5e]/30 border-t-[#264f5e] rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploading ? "Uploading…" : "Upload File"}
                    </label>
                  </div>
                </div>

                {/* Files and Folders */}
                <div className="flex-1 overflow-y-auto p-4 bg-[#f6f9fb]">
                  {loadingItems && items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#6b8a96]">
                      <span className="h-5 w-5 border-2 border-[#264f5e]/30 border-t-[#264f5e] rounded-full animate-spin mb-3" />
                      <p className="text-sm font-medium">Loading contents…</p>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#6b8a96]">
                      <Folder className="w-12 h-12 text-[#264f5e]/20 mb-3" />
                      <p className="text-sm font-medium">This folder is empty</p>
                      <p className="text-xs mt-1">Upload files or create subfolders to get started.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-[#e8eef1] overflow-hidden">
                      {/* Table Header */}
                      <div className="grid grid-cols-[40px_1fr_120px_120px_48px] items-center px-4 py-3 border-b border-[#e8eef1] bg-[#fcfdfe]">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={items.length > 0 && selectedItems.length === items.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems(items.map((i) => i.id));
                              } else {
                                setSelectedItems([]);
                              }
                            }}
                            className="rounded border-[#c2d1d9] text-[#264f5e] focus:ring-[#264f5e] cursor-pointer"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-[#6b8a96] uppercase tracking-wider pl-2">Name</span>
                        <span className="text-[11px] font-bold text-[#6b8a96] uppercase tracking-wider">Size / Type</span>
                        <span className="text-[11px] font-bold text-[#6b8a96] uppercase tracking-wider">Created</span>
                        <span />
                      </div>

                      {/* Items */}
                      <div className="divide-y divide-[#e8eef1]">
                        {/* Folders */}
                        {folders.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-[40px_1fr_120px_120px_48px] items-center px-4 py-3.5 hover:bg-[#f6f9fb] transition-colors group"
                          >
                            <div className="flex justify-center items-center">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedItems((prev) => [...prev, item.id]);
                                  else setSelectedItems((prev) => prev.filter((id) => id !== item.id));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-[#c2d1d9] text-[#264f5e] focus:ring-[#264f5e] cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center gap-4 min-w-0 pr-4 pl-2 cursor-pointer" onClick={() => handleFolderClick(item)}>
                              <Folder className="w-6 h-6 text-[#4a86e8] shrink-0 fill-[#4a86e8]/10" />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#1a3340] truncate">{item.name}</p>
                                <p className="text-[11px] font-medium text-[#6b8a96] mt-0.5 truncate">
                                  Folder
                                </p>
                              </div>
                            </div>
                            <div className="text-[12px] font-medium text-[#6b8a96]">—</div>
                            <div className="text-[12px] font-medium text-[#6b8a96]">{formatDate(item.created_time || item.modified_time)}</div>
                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Empty action area for folders to keep layout consistent */}
                            </div>
                          </div>
                        ))}

                        {/* Files */}
                        {files.map((item) => (
                          <div
                            key={item.id}
                            className={`grid grid-cols-[40px_1fr_120px_120px_48px] items-center px-4 py-3.5 transition-colors cursor-default group ${
                              previewItem?.id === item.id ? "bg-[#f6f9fb] shadow-[inset_2px_0_0_0_#264f5e]" : "hover:bg-[#f6f9fb]"
                            }`}
                          >
                            <div className="flex justify-center items-center">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedItems((prev) => [...prev, item.id]);
                                  else setSelectedItems((prev) => prev.filter((id) => id !== item.id));
                                }}
                                className="rounded border-[#c2d1d9] text-[#264f5e] focus:ring-[#264f5e] cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center gap-4 min-w-0 pr-4 pl-2">
                              <div className="shrink-0">{getFileIcon(item)}</div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#1a3340] truncate">{item.name}</p>
                                <p className="text-[11px] font-medium text-[#6b8a96] mt-0.5 truncate">
                                  {item.extn?.toUpperCase() || "FILE"} document
                                </p>
                              </div>
                            </div>
                            <div className="text-[12px] font-medium text-[#6b8a96]">{formatSize(item.size)}</div>
                            <div className="text-[12px] font-medium text-[#6b8a96]">{formatDate(item.created_time || item.modified_time)}</div>
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isPreviewable(item) && (
                                <button
                                  onClick={() => openPreview(item)}
                                  className="p-1.5 text-[#6b8a96] hover:text-[#264f5e] hover:bg-[#264f5e]/10 rounded-lg transition-colors"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <a
                                href={`/api/admin/workdrive/view?fileId=${encodeURIComponent(item.id)}&fileName=${encodeURIComponent(item.name)}&inline=false`}
                                download={item.name}
                                className="p-1.5 text-[#6b8a96] hover:text-[#264f5e] hover:bg-[#264f5e]/10 rounded-lg transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {previewItem && (
            <div className="w-1/2 border-l border-[#e8eef1] bg-white flex flex-col z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8eef1] shrink-0 bg-white">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1a3340] truncate">{previewItem.name}</p>
                  <p className="text-[11px] font-medium text-[#6b8a96] mt-0.5">
                    {previewItem.extn?.toUpperCase() || "FILE"} · {formatSize(previewItem.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <a
                    href={`/api/admin/workdrive/view?fileId=${encodeURIComponent(previewItem.id)}&fileName=${encodeURIComponent(previewItem.name)}&inline=false`}
                    download={previewItem.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e8eef1] rounded-xl text-sm font-semibold text-[#264f5e] hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                  <button
                    onClick={closePreview}
                    className="p-1.5 text-[#6b8a96] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-[#f6f9fb] flex items-center justify-center p-4">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-2 text-[#264f5e]">
                    <span className="h-6 w-6 border-2 border-[#264f5e]/30 border-t-[#264f5e] rounded-full animate-spin" />
                    <span className="text-sm font-medium">Loading preview…</span>
                  </div>
                ) : previewUrl ? (
                  <div className="w-full h-full rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden flex items-center justify-center">
                    {isImage(previewItem) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={previewItem.name}
                        className="max-w-full max-h-full object-contain p-4"
                      />
                    ) : (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title={previewItem.name}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-[#6b8a96]">
                    <Eye className="w-8 h-8 opacity-40 mb-2" />
                    <p className="text-sm font-medium">Preview unavailable</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
