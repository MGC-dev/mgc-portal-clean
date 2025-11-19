"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useState } from "react";
import { } from "lucide-react";

export default function BillingPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
 

  return (
    <div className="flex min-h-screen bg-gray-50">
      
       {/* Sidebar - hidden on mobile */}
            <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
              <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>
             {/* Sidebar (mobile overlay) */}
            {isSidebarOpen && (
              <div className="fixed inset-0 z-50 flex">
                {/* Blur overlay without dark tint */}
                <div
                  className="fixed inset-0 backdrop-blur-sm"
                  onClick={() => setSidebarOpen(false)}
                />
                {/* Sidebar drawer */}
                <div className="relative z-50 w-64 bg-white shadow-lg">
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}/>
                </div>
              </div>
            )}

      {/* Main Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-3 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">Billing & Invoices</h2>
          </div>
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <p className="text-gray-700">No invoices at the moment</p>
          </div>
        </main>
      </div>
    </div>
  );
}
