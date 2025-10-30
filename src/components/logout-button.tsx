"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e) {
      // Soft-fail: still navigate to login
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className="px-3 py-1 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-50"
      title="Sign out"
    >
      {loading ? "Signing out..." : "Logout"}
    </button>
  );
}