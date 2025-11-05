"use client";
import { ShieldAlert } from "lucide-react";
import LogoutButton from "@/components/logout-button";

export default function SuspendedPage() {
  const supportEmail = "support@mgconsultingfirm.com";
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900 p-8">
      <div className="max-w-xl w-full">
        <div className="rounded-2xl border bg-white shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 h-10 w-10">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Account Suspended</h1>
              <p className="text-sm text-gray-600">Access is temporarily disabled.</p>
            </div>
          </div>

          <p className="mt-4 text-gray-700">
            If you believe this is an error or would like to request a review, please reach out to our support team.
          </p>

          <div className="mt-4 rounded-lg border p-4 bg-gray-50">
            <p className="text-gray-800 text-sm">
              Email: <a className="text-blue-600 hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
            </p>
            {supportPhone ? (
              <p className="text-gray-800 text-sm mt-2">Phone: {supportPhone}</p>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-end">
            <LogoutButton />
          </div>

          <p className="mt-4 text-xs text-gray-500">
            For privacy and security, we may ask you to verify account ownership when you reach out.
          </p>
        </div>
      </div>
    </div>
  );
}