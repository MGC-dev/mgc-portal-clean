"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ForgotResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingForgot, setLoadingForgot] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoadingForgot(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send reset link");
      } else {
        setMessage(data.message || "If the email exists, a reset link has been sent.");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again later!");
    } finally {
      setLoadingForgot(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoadingReset(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed.");
      } else {
        setResetMessage(data.message || "Password has been reset successfully!");
      }
    } catch (err: any) {
      setError(err?.message || "Reset failed.");
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-24 justify-center relative">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {token ? "Reset Password" : "Forgot Password"}
            </h1>
            <p className="text-zinc-500 text-[15px]">
              {token
                ? "Enter and confirm a new password for your account."
                : "Enter your email to receive a password reset link."}
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-[14px]">
                {error}
              </div>
            )}
            
            {!token ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#1d1d1f] text-[14px] font-medium">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-white border-zinc-200 text-[#1d1d1f] placeholder:text-[#86868b] focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3] rounded-[10px] transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#264f5e] hover:bg-[#1f424e] text-white font-medium rounded-[10px] transition-all"
                  disabled={loadingForgot}
                >
                  {loadingForgot ? "Sending..." : "Send Reset Link"}
                </Button>
                {message && (
                  <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-[14px]">
                    {message}
                  </div>
                )}
                <div className="text-center pt-2">
                  <Link href="/login" className="text-[14px] text-[#0071e3] hover:text-[#0077ed] font-medium">
                    Back to login
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-[#1d1d1f] text-[14px] font-medium">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-12 bg-white border-zinc-200 text-[#1d1d1f] placeholder:text-[#86868b] focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3] rounded-[10px] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[#1d1d1f] text-[14px] font-medium">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 bg-white border-zinc-200 text-[#1d1d1f] placeholder:text-[#86868b] focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3] rounded-[10px] transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#264f5e] hover:bg-[#1f424e] text-white font-medium rounded-[10px] transition-all"
                  disabled={loadingReset}
                >
                  {loadingReset ? "Resetting..." : "Reset Password"}
                </Button>
                {resetMessage && (
                  <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-[14px]">
                    {resetMessage}
                  </div>
                )}
                <div className="text-center pt-2">
                  <Link href="/login" className="text-[14px] text-[#0071e3] hover:text-[#0077ed] font-medium">
                    Back to login
                  </Link>
                </div>
              </form>
            )}
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