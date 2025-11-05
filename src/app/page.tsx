import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/modern-office-building.png')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-slate-900/50 to-blue-800/60" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg flex items-center justify-center shadow-xl overflow-hidden">
            <Image
              src="/logo.png"
              alt="MG Consulting logo"
              width={48}
              height={48}
              priority
              style={{ objectFit: "contain" }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">
            MG Consulting Firm
          </h1>
          <p className="text-white/90 drop-shadow-md">Welcome to your client portal</p>
        </div>

        {/* Main Card */}
        <Card className="bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">Get Started</CardTitle>
            <CardDescription className="text-white/80">
              Choose an option below to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Login Button */}
            <Link href="/login" className="block">
              <Button className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700">
                Sign In
              </Button>
            </Link>

            {/* Register Button */}
            <Link href="/register" className="block">
              <Button variant="outline" className="w-full h-12 text-lg font-medium border-white/80 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm">
                Create Account
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-white/70">
          <p>&copy; {new Date().getFullYear()} MG Consulting Firm. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
