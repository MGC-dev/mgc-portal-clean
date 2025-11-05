"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { AlertBanner } from "@/components/ui/alert-banner";
import { ContractSigningModal } from "@/components/contract-signing-modal";
import { useAuth } from "@/hooks/use-auth";

type Contract = {
  id: string;
  title: string;
  status: "draft" | "sent" | "signed" | "void";
  created_at: string;
  file_url?: string | null;
};

export default function ContractsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Embedded signing modal state
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signContractId, setSignContractId] = useState<string | null>(null);
  const [pageBanner, setPageBanner] = useState<{ variant: "success" | "error" | "info" | "warning"; message: string } | null>(null);
  const { user, loading: authLoading } = useAuth();

  // Helper to enforce a timeout for fetch operations without throwing
  const withTimeout = async <T,>(fn: () => Promise<T>, ms: number): Promise<T | null> => {
    return new Promise<T | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      fn()
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch(() => {
          clearTimeout(timer);
          resolve(null);
        });
    });
  };

  // Load contracts (shared across initial load and refreshes)
  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Do not block on client auth; server API enforces auth via cookies

      // Use server API backed by service role to avoid RLS hiccups
      const contractsResp = await withTimeout(
        () => fetch("/api/contracts/list", { headers: { accept: "application/json" } }),
        12000
      );

      if (!contractsResp) {
        setError("Loading contracts timed out");
        setLoading(false);
        return;
      }

      const json = await (contractsResp as Response).json().catch(() => ({}));
      if (!(contractsResp as Response).ok) {
        // Surface 401 as an auth issue; otherwise show backend error
        const isUnauthorized = (contractsResp as Response).status === 401;
        setError(isUnauthorized ? "Not authenticated" : (json?.error || "Failed to load contracts"));
        setLoading(false);
        return;
      }

      setContracts((json?.contracts || []) as Contract[]);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Failed to load contracts");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch on mount; rely on server to enforce auth
    fetchContracts();
  }, []);

  async function handleView(contractId: string) {
    try {
      const res = await fetch(`/api/contracts/${contractId}/url`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to generate URL");
      window.open(json.url, "_blank");
    } catch (e: any) {
      setPageBanner({ variant: "error", message: e?.message || "Failed to open contract" });
    }
  }

  async function handleDownload(contractId: string) {
    try {
      const res = await fetch(`/api/contracts/${contractId}/signed-url`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to generate download URL");
      window.open(json.url, "_blank");
    } catch (e: any) {
      setPageBanner({ variant: "error", message: e?.message || "Failed to download signed contract" });
    }
  }

  async function handleSign(contract: Contract) {
    // No client-side download; server will fetch and start signing
    setSignContractId(contract.id);
    setSignModalOpen(true);
  }

  async function handleSigningComplete() {
    // Refresh the contracts list to show updated status
    await fetchContracts();
    
    // Show success message
    setPageBanner({ 
      variant: "success", 
      message: "Contract signed successfully! The document has been saved." 
    });
  }

  function handleCloseSigningModal() {
    setSignModalOpen(false);
    setSignContractId(null);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
       {/* Sidebar (mobile overlay) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Blur overlay */}
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar drawer */}
          <div className="relative z-50 w-64 bg-white shadow-lg">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}/>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Contracts & Agreements</h2>

          {/* Outer card */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
            <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4">Active Contracts</h3>

            {pageBanner && (
              <div className="mb-4">
                <AlertBanner
                  variant={pageBanner.variant}
                  message={pageBanner.message}
                  onClose={() => setPageBanner(null)}
                />
              </div>
            )}

            {loading && null}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="space-y-4">
              {!loading && !error && contracts.length === 0 && (
                <p className="text-sm text-gray-500">No active contracts yet. If you’re expecting one, please contact support.</p>
              )}

              {contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white rounded-lg border shadow-sm p-4 gap-3"
                >
                  {/* Left: icon + info */}
                  <div className="flex items-start gap-3">
                    <FileText size={24} className="text-gray-500 mt-1" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="font-medium text-base sm:text-lg">
                          {c.title}
                         </h4>
                        <span
                          className={`px-2 sm:px-3 py-0.5 text-xs rounded-full font-medium ${
                            c.status === "signed"
                              ? "bg-blue-300 text-blue-800"
                              : "bg-gray-300 text-gray-800"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Created:{" "}
                        {new Date(c.created_at).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      className="w-full sm:w-auto flex items-center justify-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
                      onClick={() => handleView(c.id)}
                    >
                      <FileText size={16} /> View
                    </button>
                    {c.status === "sent" && (
                      <button
                        className="w-full sm:w-auto flex items-center justify-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
                        onClick={() => handleSign(c)}
                      >
                        Sign
                      </button>
                    )}
                    <button
                      className="w-full sm:w-auto flex items-center justify-center gap-2 border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                      disabled={c.status !== "signed"}
                      onClick={() => handleDownload(c.id)}
                    >
                      <Download size={16} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contract Signing Modal */}
           {signModalOpen && signContractId && (
             <ContractSigningModal
               isOpen={signModalOpen}
               onClose={handleCloseSigningModal}
               contractId={signContractId || ""}
               contractTitle={contracts.find(c => c.id === signContractId)?.title || "Contract"}
               onSigningComplete={handleSigningComplete}
             />
           )}
        </main>
      </div>
    </div>
  );
}
