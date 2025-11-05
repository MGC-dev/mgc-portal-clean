"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useState } from "react";
import CalendlyWidget from "@/components/calendly-widget";
import { useAuth } from "@/hooks/use-auth";

export default function AppointmentsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile } = useAuth();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Sidebar (mobile overlay) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 w-64 bg-white shadow-lg">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main Content cleared */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl sm:text-2xl font-bold">Appointments</h2>
          <p className="text-gray-600 mt-2">Schedule and book appointments via Calendly.</p>

          {/* Use env-based Calendly URL so it aligns with the API token account */}
          <CalendlyWidget
            mode="inline"
            inlineHeight={700}
            className="w-full mt-6"
            prefill={{
              email: user?.email ?? undefined,
              name: profile?.full_name ?? undefined,
            }}
          />
        </main>
      </div>
    </div>
  );
}
