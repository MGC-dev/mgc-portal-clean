"use client";

import { useEffect, useState } from "react";
import { Loader2, Power, ShieldAlert } from "lucide-react";
import { ActionButton, Dot, ErrorNote, Panel, Pill } from "@/components/dev/ui";

type Maintenance = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
  updatedBy: string | null;
};

export default function MaintenanceToggle({ initial }: { initial?: Maintenance | null }) {
  const [state, setState] = useState<Maintenance | null>(initial ?? null);
  const [message, setMessage] = useState(initial?.message ?? "");
  const [loading, setLoading] = useState(!initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/dev/maintenance", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setState(json.maintenance);
      setMessage(json.maintenance.message);
      setError(null);
    } catch (e: any) {
      setError(`${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initial) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (enabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, message }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setState(json.maintenance);
      setMessage(json.maintenance.message);
      setConfirming(false);
    } catch (e: any) {
      setError(`${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const enabled = Boolean(state?.enabled);
  const messageDirty = Boolean(state) && message.trim() !== state!.message;

  return (
    <Panel
      title="Maintenance Mode"
      subtitle="Closes every page to clients and admins. Developers keep full access, and API routes keep serving so webhooks are not dropped."
      action={
        enabled ? (
          <Pill tone="fail">
            <Dot tone="fail" pulse />
            Site closed
          </Pill>
        ) : (
          <Pill tone="ok">
            <Dot tone="ok" />
            Live
          </Pill>
        )
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 py-4 text-[12.5px] text-[var(--dev-text-secondary)]">
          <Loader2 size={14} className="animate-spin" /> Reading current state…
        </div>
      ) : (
        <div className="space-y-5">
          {error && <ErrorNote message={error} />}

          <div
            className={`flex flex-wrap items-center justify-between gap-5 rounded-2xl px-5 py-4 transition-colors duration-300 ${
              enabled
                ? "bg-[var(--dev-fail-soft)]"
                : "bg-[var(--dev-surface-sunken)] border border-[var(--dev-hairline)]"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                  enabled
                    ? "bg-[#ff3b30] text-white shadow-[0_2px_8px_rgba(255,59,48,0.3)]"
                    : "bg-white text-[var(--dev-ok)] border border-[var(--dev-hairline)] shadow-[var(--dev-shadow-sm)]"
                }`}
              >
                {enabled ? <ShieldAlert size={18} /> : <Power size={18} />}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[var(--dev-text)] tracking-[-0.015em]">
                  {enabled ? "Maintenance mode is on" : "Maintenance mode is off"}
                </p>
                <p className="text-[12.5px] text-[var(--dev-text-secondary)] mt-0.5">
                  {enabled
                    ? "Visitors are being redirected to /maintenance."
                    : "All users can reach the portal normally."}
                </p>
              </div>
            </div>

            {/* Turning it ON asks for confirmation; turning it OFF is immediate. */}
            {confirming ? (
              <div className="flex items-center gap-2">
                <ActionButton onClick={() => save(true)} busy={saving} tone="danger">
                  {saving ? "Closing…" : "Yes, close the site"}
                </ActionButton>
                <ActionButton onClick={() => setConfirming(false)} tone="neutral" disabled={saving}>
                  Cancel
                </ActionButton>
              </div>
            ) : (
              <ActionButton
                onClick={() => (enabled ? save(false) : setConfirming(true))}
                busy={saving}
                tone={enabled ? "accent" : "neutral"}
              >
                {enabled ? "Bring the site back online" : "Enable maintenance mode"}
              </ActionButton>
            )}
          </div>

          <div>
            <label
              htmlFor="maintenance-message"
              className="block text-[12.5px] font-medium text-[var(--dev-text-secondary)] mb-2"
            >
              Message shown to visitors
            </label>
            <textarea
              id="maintenance-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full rounded-xl bg-[var(--dev-surface-sunken)] border border-[var(--dev-hairline)] px-3.5 py-2.5 text-[13px] text-[var(--dev-text)] placeholder:text-[var(--dev-text-tertiary)] focus:outline-none focus:border-[var(--dev-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--dev-accent-soft)] transition-all duration-200 resize-none"
              placeholder="We are performing scheduled maintenance…"
            />
            {messageDirty && (
              <div className="mt-2.5">
                <ActionButton onClick={() => save(enabled)} busy={saving} tone="neutral">
                  {saving ? "Saving…" : "Save message"}
                </ActionButton>
              </div>
            )}
          </div>

          {state?.updatedAt && (
            <p className="text-[11.5px] text-[var(--dev-text-tertiary)] leading-relaxed">
              Last changed {new Date(state.updatedAt).toLocaleString()}
              {state.updatedBy ? ` by ${state.updatedBy}` : ""}. Changes reach every warm instance
              within 10 seconds.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
