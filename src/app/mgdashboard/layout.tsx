import type React from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import DashboardShell from "./dashboard-shell";

export default async function MgDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      const { data: existing, error: selectError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing && !selectError) {
        const { data: emailExisting, error: emailSelectError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", user.email!)
          .maybeSingle();

        if (!emailExisting && !emailSelectError) {
          const { error: insertError } = await supabase.from("profiles").insert([
            {
              id: user.id,
              email: user.email,
              full_name: (user.user_metadata as any)?.full_name ?? null,
              company_name: (user.user_metadata as any)?.company_name ?? null,
              phone: (user.user_metadata as any)?.phone ?? null,
              address: (user.user_metadata as any)?.address ?? null,
              role: "client",
            },
          ]);
          if (insertError) {
            console.warn("[ensureProfileExists] insert skipped due to constraint:", insertError.message);
          }
        }
      }
    } catch (err) {
      console.error("[ensureProfileExists] unexpected error:", (err as any)?.message ?? err);
    }
  }

  return <DashboardShell>{children}</DashboardShell>;
}