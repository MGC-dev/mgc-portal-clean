import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = profile?.role && ["admin", "super_admin"].includes(profile.role);
    redirect(isAdmin ? "/admin" : "/mgdashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbfbfd] p-6 selection:bg-zinc-200">
      <div className="w-full max-w-sm space-y-12">
        {/* Logo and Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="MG Consulting logo"
              width={64}
              height={64}
              priority
              className="object-contain"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
              MG Consulting Firm
            </h1>
            <p className="text-[#86868b] text-[15px]">
              Welcome to your client portal
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/login" className="block">
            <Button className="w-full h-12 text-[15px] font-medium bg-[#264f5e] hover:bg-[#1f424e] text-white rounded-[10px] transition-all shadow-sm border border-transparent">
              Sign In
            </Button>
          </Link>
          <Link href="/register" className="block">
            <Button variant="outline" className="w-full h-12 text-[15px] font-medium border-[#d2d2d7] text-[#1d1d1f] bg-white hover:bg-white/50 hover:text-[#1d1d1f] rounded-[10px] transition-all shadow-sm">
              Create Account
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-[12px] text-[#86868b] pt-8">
          <p>&copy; {new Date().getFullYear()} MG Consulting Firm. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
