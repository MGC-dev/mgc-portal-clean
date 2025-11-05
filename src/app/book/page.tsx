"use client";

import CalendlyWidget from "@/components/calendly-widget";

export default function BookPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Book Time With Me</h1>
      <p className="text-gray-600 mb-6">
        Choose a time that works for you. This Calendly embed loads your event type
        from <code>NEXT_PUBLIC_CALENDLY_URL</code>.
      </p>
      <div className="rounded-lg border bg-white">
        <CalendlyWidget mode="inline" inlineHeight={760} className="w-full" />
      </div>
    </div>
  );
}