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
    <div className="min-h-screen bg-white text-gray-900 p-8">
      {dialog}
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin • Contracts</h1>
          <Link href="/admin" className="text-blue-600 hover:underline">Back to Admin</Link>
        </header>

        {/* Upload new contract section */}
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Assign Contract to Client</h2>
          <p className="text-sm text-gray-600 mt-1">Upload a contract and assign it to a client from the list. The client will see it in their dashboard and can sign or download.</p>

          {message && (
            <div className="mt-3 text-sm">
              <span className="px-3 py-2 rounded-md border bg-gray-50">{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Client</label>
              {clientsLoading ? (
                null
              ) : clientsError ? (
                <div className="mt-1 text-sm text-red-600">{clientsError}</div>
              ) : (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border px-3 py-2"
                >
                  <option value="" disabled>
                    Select a client
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.profile?.full_name || c.email || c.id) + (c.email ? ` (${c.email})` : "")}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-md border px-3 py-2"
                placeholder="Consulting Services Agreement"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Contract File (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                {"Upload & Assign"}
              </button>
            </div>
          </form>
        </section>

        {/* Existing contracts section */}
        <section className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold">Existing Contracts</h2>
          <p className="text-sm text-gray-600 mt-1">Manage existing contracts and link them to Zoho Sign if needed.</p>

          {contractsLoading && null}
          {contractsError && <p className="text-sm text-red-600 mt-4">{contractsError}</p>}

          {!contractsLoading && !contractsError && (
            <div className="mt-4 space-y-3">
              {contracts.length === 0 ? (
                <p className="text-sm text-gray-500">No contracts found.</p>
              ) : (
                contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 rounded-lg border p-4 gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{contract.title}</h4>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            contract.status === "signed"
                              ? "bg-green-100 text-green-800"
                              : contract.status === "sent"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {contract.status}
                        </span>
                        {contract.zoho_request_id ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                            Zoho Linked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                            No Zoho Link
                          </span>
                        )}
                        {contract.signed_file_url ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                            Signed PDF stored
                          </span>
                        ) : null}
                        {contract.zoho_document_id ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                            Zoho Doc ID: {contract.zoho_document_id}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Client: {contract.client_profile?.full_name || contract.client_email || contract.client_user_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(contract.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {contract.id}
                      </p>
                      <p className="text-xs text-gray-500">
                        File path: {contract.file_url ?? "— not set —"}
                      </p>
                      {contract.zoho_request_id ? (
                        <p className="text-xs text-gray-500">Zoho Request: {contract.zoho_request_id}</p>
                      ) : null}
                      {contract.zoho_sign_url ? (
                        <p className="text-xs text-gray-500">Signing URL: present</p>
                      ) : (
                        <p className="text-xs text-gray-500">Signing URL: not yet</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenSigning(contract)}
                        disabled={!contract.zoho_request_id}
                        className="px-3 py-1 text-sm rounded-md bg-green-600 text-white disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {"Open Signing"}
                      </button>
                      <button
                        onClick={() => handleViewFile(contract.id)}
                        disabled={!contract.file_url}
                        className="px-3 py-1 text-sm rounded-md bg-purple-600 text-white disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {"View File"}
                      </button>
                      {!contract.zoho_request_id && (
                        <button
                          onClick={() => handleLinkZoho(contract.id)}
                          disabled={linkingContract === contract.id}
                          className="px-3 py-1 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {"Link Zoho"}
                        </button>
                      )}
                      <button
                        onClick={() => handleRefreshStatus(contract.id)}
                        disabled={refreshingContract === contract.id}
                        className="px-3 py-1 text-sm rounded-md bg-gray-200 text-gray-900 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {"Refresh Status"}
                      </button>
                      <button
                        onClick={() => handleDelete(contract.id)}
                        disabled={deletingContract === contract.id}
                        className="px-3 py-1 text-sm rounded-md bg-red-600 text-white disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {"Delete"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}