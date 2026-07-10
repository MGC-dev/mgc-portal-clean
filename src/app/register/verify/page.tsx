"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VerifyPage() {
  const router = useRouter();
  const search = useSearchParams();
  const email = search.get("email") || "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onVerify = async () => {
    if (!email) {
      setError("Missing email. Please return to registration.");
      return;
    }
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Verification failed");
      } else {
        setSuccess("Email verified successfully. Redirecting to login...");
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch (e: any) {
      setError(e?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-24 justify-center relative">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Verify your email
            </h1>
            <p className="text-zinc-500 text-[15px]">
              Enter the 6-digit code we sent to {email || "your email"}.
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-[14px]">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-[14px]">
                {success}
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="h-12 flex-1 bg-white border-zinc-200 text-[#1d1d1f] placeholder:text-[#86868b] focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3] rounded-[10px] transition-all"
              />
              <Button 
                onClick={onVerify} 
                disabled={loading || code.length < 6} 
                className="h-12 bg-[#264f5e] hover:bg-[#1f424e] text-white font-medium rounded-[10px] transition-all px-6"
              >
                Verify
              </Button>
            </div>
            
            <div className="pt-2">
              <Link 
                href="/register" 
                className="text-[14px] text-[#0071e3] hover:text-[#0077ed] font-medium"
              >
                &larr; Back to registration
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Graphic/Image */}
      <div className="hidden lg:flex w-1/2 bg-zinc-50 items-center justify-center relative overflow-hidden border-l border-zinc-100">
         <div
           className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 grayscale"
           style={{ backgroundImage: `url('/modern-office-building.png')` }}
         />
         <div className="absolute inset-0 bg-gradient-to-br from-[#264f5e]/90 to-[#1a3340]/95" />
         
         <div className="relative z-10 flex flex-col items-center justify-center text-center p-12 text-white">
            <div className="inline-flex items-center gap-5 mb-12 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl">
              <Image
                src="/logo.png"
                alt="MG Consulting logo"
                width={60}
                height={60}
                className="object-contain drop-shadow-lg"
              />
              <div className="w-[1px] h-12 bg-white/20 rounded-full" />
              <div className="flex flex-col items-start text-left">
                <span className="text-2xl font-semibold tracking-tight text-white leading-tight">
                  MG Consulting Firm
                </span>
              </div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Empowering your business</h2>
            <p className="text-white/80 max-w-md text-lg">
              Access your client portal to manage documents, view contracts, and get support.
            </p>
         </div>
      </div>
    </div>
  );
}