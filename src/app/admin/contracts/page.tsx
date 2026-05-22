"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useRouter } from "next/navigation";

export default function AdminContractsPage() {
  const { confirm, dialog } = useConfirm();
  async function parseJsonOrThrow(res: Response) {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      // Read text to consume body and provide a clearer error
      const txt = await res.text().catch(() => Promise.resolve(""));
      const url = (res as any)?.url || "";
      const path = url ? (() => { try { return new URL(url).pathname; } catch { return url; } })() : "";
      if (txt) console.warn("Non-JSON response from", path || url || "unknown", "status", res.status, "body", txt.slice(0, 200));
      throw new Error(`Unexpected non-JSON response (${res.status})${path ? ` from ${path}` : ""}.`);
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status}).`);
    }
    return data;
  }
  type ClientUser = {
    id: string;
    email: string | null;
    profile: { full_name?: string | null; role?: string | null } | null;
  };

  type Contract = {
    id: string;
    title: string;
    status: "draft" | "sent" | "signed" | "void";
    created_at: string;
    client_user_id: string;
    file_url?: string | null;
    zoho_request_id: string | null;
    zoho_sign_url?: string | null;
    zoho_document_id?: string | null;
    signed_file_url?: string | null;
    client_profile?: { full_name?: string | null } | null;
    client_email?: string | null;
  };

  const [clients, setClients] = useState<ClientUser[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Existing contracts state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [linkingContract, setLinkingContract] = useState<string | null>(null);
  const [deletingContract, setDeletingContract] = useState<string | null>(null);
  const [refreshingContract, setRefreshingContract] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function loadClients() {
      try {
        setClientsLoading(true);
        setClientsError(null);
        const res = await fetch(`/api/admin/users?perPage=200`, {
          headers: { accept: "application/json" },
        });
        const json = await parseJsonOrThrow(res);
        const allUsers: any[] = json?.users || [];
        const clientUsers = allUsers.filter((u) => (u?.profile?.role || "client") === "client");
        const simplified: ClientUser[] = clientUsers.map((u) => ({
          id: u.id,
          email: u.email || u?.profile?.email || null,
          profile: u.profile || null,
        }));
        setClients(simplified);
      } catch (e: any) {
        setClientsError(e?.message || "Failed to load clients");
      } finally {
        setClientsLoading(false);
      }
    }

    async function loadContracts() {
      try {
        setContractsLoading(true);
        setContractsError(null);
        const res = await fetch('/api/admin/contracts', {
          headers: { accept: "application/json" },
        });
        const json = await parseJsonOrThrow(res);
        setContracts(json.contracts || []);
      } catch (e: any) {
        setContractsError(e?.message || "Failed to load contracts");
      } finally {
        setContractsLoading(false);
      }
    }

    loadClients();
    loadContracts();
  }, []);

  async function handleRefreshStatus(contractId: string) {
    try {
      setRefreshingContract(contractId);
      const res = await fetch(`/api/contracts/${contractId}/status`, { headers: { accept: "application/json" } });
      const json = await parseJsonOrThrow(res);
      // Reload contracts to reflect updated status
      const listRes = await fetch('/api/admin/contracts', { headers: { accept: "application/json" } });
      const listJson = await parseJsonOrThrow(listRes);
      setContracts(listJson.contracts || []);
    } catch (e: any) {
      setContractsError(e?.message || "Failed to refresh status");
    } finally {
      setRefreshingContract(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!selectedClientId) {
      setMessage("Please select a client");
      return;
    }
    if (!file) {
      setMessage("Please select a file");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("client_user_id", selectedClientId);
      form.append("title", title);
      form.append("file", file);
      const res = await fetch("/api/admin/contracts/upload", {
        method: "POST",
        body: form,
      });
      const json = await parseJsonOrThrow(res);
      setMessage("Contract uploaded and sent to client.");
      setSelectedClientId("");
      setTitle("");
      setFile(null);
      // Reload contracts to show the new one
      const contractsRes = await fetch('/api/admin/contracts', {
        headers: { accept: "application/json" },
      });
      if (contractsRes.ok) {
        const contractsJson = await parseJsonOrThrow(contractsRes);
        setContracts(contractsJson.contracts || []);
      }
    } catch (err: any) {
      setMessage(err.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewFile(contractId: string) {
    setMessage(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/url`, { headers: { accept: "application/json" } });
      const json = await parseJsonOrThrow(res);
      const { url } = json;
      if (!url) {
        setMessage("No signed URL returned. Ensure file_url is set.");
        return;
      }
      window.open(url, "_blank");
    } catch (e: any) {
      setMessage(e?.message || "Failed to open file");
    }
  }

  async function handleLinkZoho(contractId: string) {
    setLinkingContract(contractId);
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/link-zoho`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const json = await parseJsonOrThrow(res);
      
      // Update the contract in the list
      setContracts(prev => prev.map(c => 
        c.id === contractId 
          ? { ...c, zoho_request_id: json.zoho_request_id || "linked", zoho_sign_url: json.url || c.zoho_sign_url }
          : c
      ));
      
      setMessage(`Contract linked to Zoho successfully! Request ID: ${json.zoho_request_id}`);
    } catch (err: any) {
      setMessage(`Failed to link contract: ${err.message}`);
    } finally {
      setLinkingContract(null);
    }
  }

  async function handleOpenSigning(contract: Contract) {
    setMessage(null);
    try {
      // Prefer stored signing URL if present
      if (contract.zoho_sign_url) {
        window.open(contract.zoho_sign_url, "_blank");
        return;
      }
      // Fall back to API generation
      const res = await fetch(`/api/contracts/${contract.id}/sign-url`, { headers: { accept: "application/json" } });
      const json = await parseJsonOrThrow(res);
      const url = json?.url as string | undefined;
      if (url) {
        // Update local state for this contract
        setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, zoho_sign_url: url } : c));
        window.open(url, "_blank");
        return;
      }
      const hint = json?.hint as string | undefined;
      setMessage(hint ? `No signing URL yet. Hint: ${hint}` : "No signing URL yet.");
    } catch (e: any) {
      setMessage(e?.message || "Failed to get signing URL");
    }
  }

  async function handleDelete(contractId: string) {
    const ok = await confirm({
      title: "Delete contract",
      description: "This will permanently remove the file and its record.",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;
    setDeletingContract(contractId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}`, {
        method: "DELETE",
        headers: { accept: "application/json" },
      });
      const json = await parseJsonOrThrow(res);
      // Remove from local state
      setContracts((prev) => prev.filter((c) => c.id !== contractId));
      setMessage("Contract deleted successfully.");
    } catch (err: any) {
      setMessage(`Failed to delete contract: ${err.message}`);
    } finally {
      setDeletingContract(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {dialog}

      {/* Page header */}
      <header>
        <p className="text-xs font-semibold tracking-widest text-[#264f5e]/60 uppercase mb-1">
          Admin Portal
        </p>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1a3340] tracking-tight">Contracts & Agreements</h1>
            <p className="text-sm text-[#6b8a96]">Upload, assign and manage client contracts</p>
          </div>
        </div>
      </header>

      {/* Status message */}
      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${message.toLowerCase().includes("fail") || message.toLowerCase().includes("error") ? "bg-red-50 border-red-100 text-red-600" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
          {message}
        </div>
      )}

      {/* Upload new contract */}
      <section className="rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e8eef1]">
          <h2 className="text-sm font-semibold text-[#1a3340]">Assign Contract to Client</h2>
          <p className="text-xs text-[#6b8a96] mt-0.5">Upload a PDF and assign it to a client. They'll see it in their dashboard.</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">Client</label>
                {clientsLoading ? (
                  <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
                ) : clientsError ? (
                  <div className="text-sm text-red-500">{clientsError}</div>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] bg-white focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10"
                  >
                    <option value="" disabled>Select a client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {(c.profile?.full_name || c.email || c.id) + (c.email ? ` (${c.email})` : "")}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Consulting Services Agreement"
                  className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] placeholder:text-[#9bb5be] focus:outline-none focus:border-[#264f5e]/40 focus:ring-2 focus:ring-[#264f5e]/10"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#264f5e] uppercase tracking-wide mb-1.5">Contract File (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="w-full rounded-xl border border-[#e8eef1] px-3 py-2.5 text-sm text-[#1a3340] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#264f5e]/10 file:text-[#264f5e] file:text-xs file:font-semibold hover:file:bg-[#264f5e]/20"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#264f5e] text-white text-sm font-semibold hover:bg-[#1f3f4c] transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading…</>
              ) : "Upload & Assign"}
            </button>
          </form>
        </div>
      </section>

      {/* Existing contracts */}
      <section className="rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#e8eef1]">
          <h2 className="text-sm font-semibold text-[#1a3340]">Existing Contracts</h2>
          <p className="text-xs text-[#6b8a96] mt-0.5">Manage contracts and link them to Zoho Sign</p>
        </div>
        <div className="p-4">
          {contractsLoading && (
            <div className="space-y-3 p-2">
              {[1,2,3].map(i => (
                <div key={i} className="rounded-xl border border-[#e8eef1] p-4 animate-pulse">
                  <div className="h-4 w-48 bg-gray-100 rounded-lg mb-2" />
                  <div className="h-3 w-32 bg-gray-50 rounded-full" />
                </div>
              ))}
            </div>
          )}
          {contractsError && <p className="text-sm text-red-500 p-4">{contractsError}</p>}
          {!contractsLoading && !contractsError && (
            <div className="space-y-3">
              {contracts.length === 0 ? (
                <div className="text-center py-10 text-[#6b8a96] text-sm">No contracts found.</div>
              ) : (
                contracts.map((contract) => (
                  <div key={contract.id} className="rounded-xl border border-[#e8eef1] bg-[#f6f9fb] p-4 hover:border-[#264f5e]/20 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-semibold text-[#1a3340] text-sm">{contract.title}</h4>
                          <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold uppercase tracking-wide border ${
                            contract.status === "signed" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : contract.status === "sent" ? "bg-sky-50 text-sky-600 border-sky-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}>{contract.status}</span>
                          {contract.zoho_request_id
                            ? <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Zoho Linked</span>
                            : <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-red-50 text-red-500 border border-red-200">No Zoho Link</span>
                          }
                          {contract.signed_file_url && <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-violet-50 text-violet-600 border border-violet-200">Signed PDF</span>}
                        </div>
                        <p className="text-xs text-[#6b8a96]">Client: {contract.client_profile?.full_name || contract.client_email || contract.client_user_id}</p>
                        <p className="text-xs text-[#9bb5be] mt-0.5">Created: {new Date(contract.created_at).toLocaleString()} · ID: {contract.id.slice(0,8)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button onClick={() => handleOpenSigning(contract)} disabled={!contract.zoho_request_id}
                          className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white disabled:opacity-40 font-medium hover:bg-emerald-700 transition-colors">Open Signing</button>
                        <button onClick={() => handleViewFile(contract.id)} disabled={!contract.file_url}
                          className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white disabled:opacity-40 font-medium hover:bg-violet-700 transition-colors">View File</button>
                        {!contract.zoho_request_id && (
                          <button onClick={() => handleLinkZoho(contract.id)} disabled={linkingContract === contract.id}
                            className="px-3 py-1.5 text-xs rounded-lg bg-[#264f5e] text-white disabled:opacity-40 font-medium hover:bg-[#1f3f4c] transition-colors">
                            {linkingContract === contract.id ? "Linking…" : "Link Zoho"}
                          </button>
                        )}
                        <button onClick={() => handleRefreshStatus(contract.id)} disabled={refreshingContract === contract.id}
                          className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-[#264f5e] disabled:opacity-40 font-medium hover:bg-gray-200 transition-colors">
                          {refreshingContract === contract.id ? "Refreshing…" : "Refresh"}
                        </button>
                        <button onClick={() => handleDelete(contract.id)} disabled={deletingContract === contract.id}
                          className="px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-500 border border-red-200 disabled:opacity-40 font-medium hover:bg-red-100 transition-colors">Delete</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}