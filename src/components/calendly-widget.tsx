"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type Mode = "popup" | "inline";

type Prefill = {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
};

type UTM = {
  utmCampaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmContent?: string;
  utmTerm?: string;
};

export default function CalendlyWidget({
  url,
  mode = "popup",
  text = "Book via Calendly",
  className,
  inlineHeight = 680,
  prefill,
  utm,
}: {
  url?: string;
  mode?: Mode;
  text?: string;
  className?: string;
  inlineHeight?: number;
  prefill?: Prefill;
  utm?: UTM;
}) {
  // Base URL for Calendly. If not provided, use env or root.
  const baseUrl = url || process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/";

  // Build URL with optional prefill and UTM as query params.
  const calendlyUrl = (() => {
    try {
      const u = new URL(baseUrl);
      if (prefill) {
        if (prefill.name) u.searchParams.set("name", prefill.name);
        if (prefill.email) u.searchParams.set("email", prefill.email);
        if (prefill.firstName) u.searchParams.set("first_name", prefill.firstName);
        if (prefill.lastName) u.searchParams.set("last_name", prefill.lastName);
      }
      if (utm) {
        if (utm.utmCampaign) u.searchParams.set("utm_campaign", utm.utmCampaign);
        if (utm.utmSource) u.searchParams.set("utm_source", utm.utmSource);
        if (utm.utmMedium) u.searchParams.set("utm_medium", utm.utmMedium);
        if (utm.utmContent) u.searchParams.set("utm_content", utm.utmContent);
        if (utm.utmTerm) u.searchParams.set("utm_term", utm.utmTerm);
      }
      return u.toString();
    } catch {
      return baseUrl;
    }
  })();

  useEffect(() => {
    const head = document.head;

    // Inject Calendly CSS if not present
    const cssId = "calendly-widget-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      head.appendChild(link);
    }

    // Inject Calendly script if not present
    const scriptId = "calendly-widget-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      head.appendChild(script);
    }
  }, []);

  if (mode === "inline") {
    return (
      <div
        className="calendly-inline-widget"
        data-url={calendlyUrl}
        style={{ minWidth: "320px", height: `${inlineHeight}px` }}
      />
    );
  }

  return (
    <Button
      className={className}
      onClick={() => {
        if ((window as any).Calendly) {
          (window as any).Calendly.initPopupWidget({ url: calendlyUrl });
        }
      }}
    >
      {text}
    </Button>
  );
}