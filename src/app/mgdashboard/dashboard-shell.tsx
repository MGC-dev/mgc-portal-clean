"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Topbar from "./Topbar";
import { Menu } from "lucide-react";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Sidebar — always mounted, never torn down on navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile-only floating menu button */}
        <button
          className="md:hidden fixed top-3 left-3 z-30 inline-flex items-center justify-center rounded-xl bg-white border border-[#e5e5e5] shadow-sm p-2 hover:bg-gray-50 transition-colors"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={18} />
        </button>

        {/* Top bar — occupies the strip level with the sidebar logo block
            (py-4 + 47px badge + py-4 = 79px), so page content still begins
            exactly where the logo ends. */}
        <Topbar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pt-6 bg-[rgba(217,217,217,0.10)] md:rounded-tl-[26px]">
          {children}
        </main>
      </div>
    </div>
  );
}
