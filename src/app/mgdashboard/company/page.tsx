"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase";
import { AlertBanner } from "@/components/ui/alert-banner";
import { User, Building2, ShieldCheck, CalendarDays, Loader2 } from "lucide-react";

interface ProfileData {
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
}

export default function CompanyProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    company_name: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ variant: "success" | "error" | "info"; message: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      try {
        const timeoutMs = 15000;
        const withTimeout = <T,>(p: PromiseLike<T>, label: string): Promise<T> => {
          return Promise.race([
            p,
            new Promise<T>((_, reject) =>
              setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
            ),
          ]) as Promise<T>;
        };
        const res = await withTimeout(
          fetch("/api/profile", { headers: { accept: "application/json" } }),
          "Profile fetch"
        );
        const json = await withTimeout(res.json(), "Profile JSON").catch(() => ({} as any));
        if (!res.ok) {
          const msg = json?.error || "Failed to load profile";
          setBanner({ variant: "error", message: msg });
          return;
        }
        if (json?.profile) {
          setProfile(json.profile as ProfileData);
        }
      } catch (error) {
        const msg = (error as any)?.message || "Failed to load profile";
        setBanner({ variant: "error", message: msg });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user, authLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading && loading) {
        setBanner({ variant: "error", message: "Authentication is taking longer than expected. Please refresh." });
        setLoading(false);
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [authLoading, loading]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const timeoutMs = 15000;
      const withTimeout = <T,>(p: PromiseLike<T>, label: string): Promise<T> => {
        return Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]) as Promise<T>;
      };
      const res = await withTimeout(
        fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            full_name: profile.full_name,
            company_name: profile.company_name,
            phone: profile.phone,
          }),
        }),
        "Profile save"
      );
      const json = await withTimeout(res.json(), "Profile save JSON").catch(() => ({} as any));
      if (!res.ok) {
        setBanner({ variant: "error", message: json?.error || "Error saving profile. Please try again." });
      } else {
        setBanner({ variant: "success", message: "Profile saved successfully!" });
      }
    } catch (error: any) {
      setBanner({ variant: "error", message: error?.message || "Error saving profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : profile.email?.[0]?.toUpperCase() || "?";

  const inputClass =
    "w-full mt-1.5 bg-[#f5f5f7] border border-transparent rounded-xl px-4 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#264f5e] focus:ring-2 focus:ring-[#264f5e]/10 transition-all";
  const readonlyClass =
    "w-full mt-1.5 bg-[#f5f5f7] border border-transparent rounded-xl px-4 py-2.5 text-[15px] text-gray-400 cursor-not-allowed";

  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">Company Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account and company details</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 bg-[#264f5e] text-white px-5 py-2.5 rounded-xl hover:bg-[#1f424e] font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {banner && (
        <div className="mb-6">
          <AlertBanner variant={banner.variant} message={banner.message} onClose={() => setBanner(null)} />
        </div>
      )}

      {loading ? (
        /* Inline skeleton — stays inside the content area */
        <div className="space-y-4 animate-pulse">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                {[0, 1, 2].map((j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                    <div className="h-10 bg-gray-100 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Profile Header Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8 flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#264f5e] flex items-center justify-center text-white text-xl font-semibold shrink-0 select-none">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">{profile.full_name || "—"}</h2>
              <p className="text-sm text-gray-500">{profile.company_name || "No company set"}</p>
              <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Company Information */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8">
              <h2 className="flex items-center gap-2.5 font-semibold text-[15px] text-[#1d1d1f] mb-5">
                <div className="w-7 h-7 rounded-lg bg-[#264f5e]/10 flex items-center justify-center">
                  <Building2 size={15} className="text-[#264f5e]" />
                </div>
                Company Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className={inputClass}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">Company Name</label>
                  <input
                    type="text"
                    value={profile.company_name}
                    onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                    className={inputClass}
                    placeholder="Enter your company name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className={inputClass}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">Email</label>
                  <input type="email" value={profile.email} readOnly className={readonlyClass} />
                  <p className="text-xs text-gray-400 mt-1.5 ml-1">Email cannot be changed here</p>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8 h-fit">
              <h2 className="flex items-center gap-2.5 font-semibold text-[15px] text-[#1d1d1f] mb-5">
                <div className="w-7 h-7 rounded-lg bg-[#264f5e]/10 flex items-center justify-center">
                  <User size={15} className="text-[#264f5e]" />
                </div>
                Account Information
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-2xl">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-[#264f5e]" />
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f]">Account Status</p>
                      <p className="text-xs text-gray-500">Your account is in good standing</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Active</span>
                </div>

                <div className="flex items-center p-4 bg-[#f5f5f7] rounded-2xl gap-3">
                  <CalendarDays size={16} className="text-[#264f5e]" />
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">Member Since</p>
                    <p className="text-xs text-gray-500">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-2xl">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-[#264f5e]" />
                    <div>
                      <p className="text-sm font-medium text-[#1d1d1f]">Role</p>
                      <p className="text-xs text-gray-500">Standard client access</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium bg-[#264f5e]/10 text-[#264f5e] rounded-full">Client</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
