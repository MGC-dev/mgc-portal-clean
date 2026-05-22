import AdminSidebar from "@/components/admin-sidebar";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f6f9fb]">
      <AdminSidebar />
      {/* Main content — add top padding on mobile for the fixed header bar */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
