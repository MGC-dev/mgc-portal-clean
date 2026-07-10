"use client";

import CalendlyWidget from "@/components/calendly-widget";
import { useAuth } from "@/hooks/use-auth";

export default function AppointmentsPage() {
  const { user, profile } = useAuth();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-gray-600 mb-6">Schedule and book appointments via Calendly.</p>
      <CalendlyWidget
        mode="inline"
        inlineHeight={700}
        className="w-full"
        url="https://calendly.com/mgconsultingfirm/onboarding-call?hide_event_type_details=1&hide_gdpr_banner=1"
        prefill={{
          email: user?.email ?? undefined,
          name: profile?.full_name ?? undefined,
        }}
      />
    </div>
  );
}
