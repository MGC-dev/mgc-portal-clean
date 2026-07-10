"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export default function LogoutButton() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const withTimeout = async <T,>(p: Promise<T>, ms = 2500): Promise<T | null> => {
    return new Promise<T | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      p.then((val) => {
        clearTimeout(timer);
        resolve(val);
      }).catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  };

  const onLogout = async () => {
    try {
      setLoading(true);
      // Wait longer to allow cookies/session to clear reliably
      await withTimeout(signOut(), 6000);
    } catch (e) {
      // Soft-fail
    } finally {
      // Use hard navigation for reliability across server components
      if (typeof window !== "undefined") {
        window.location.href = "/auth/logout";
      } else {
        router.replace("/auth/logout");
      }
    }
  };

  return (
    <div className="relative w-full">
      <LoadingOverlay show={loading} label="Signing you out..." variant="default" />
      <button
        onClick={onLogout}
        disabled={loading}
        className="w-full inline-flex justify-center items-center gap-2 px-3 py-2 rounded-[8px] bg-[#264f5e] text-white hover:bg-[#1f424e] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        title="Sign out"
      >
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </div>
  );
}