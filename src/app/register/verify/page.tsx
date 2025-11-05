"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/modern-office-building.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-slate-900/50 to-blue-800/60" />

      {/* Content: standalone verification */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg flex items-center justify-center shadow-xl overflow-hidden">
            <Image src="/logo.png" alt="MG Consulting logo" width={48} height={48} priority style={{ objectFit: "contain" }} />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Verify your email</h1>
          <p className="text-white/90 drop-shadow-md">Enter the 6-digit code we sent to {email || "your email"}.</p>
        </div>

        {/* Verification Card */}
        <Card className="bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">Email Verification</CardTitle>
            <CardDescription className="text-white/80">Complete verification to finish account setup</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-3 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-md text-sm">{error}</div>
            )}
            {success && (
              <div className="mb-3 bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-2 rounded-md text-sm">{success}</div>
            )}
            <div className="flex items-center gap-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
              />
              <Button onClick={onVerify} disabled={loading || code.length < 6} className="bg-blue-600 text-white hover:bg-blue-700">
                Verify
              </Button>
            </div>
            <div className="mt-3 text-sm text-white/80">
              <Link href="/register" className="underline">Back to registration</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}