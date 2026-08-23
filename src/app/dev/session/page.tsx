"use client";

import {
  Empty,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Pill,
  RefreshButton,
  Row,
} from "@/components/dev/ui";
import { useDevResource } from "@/components/dev/use-dev-resource";

type SessionPayload = {
  user: {
    id: string;
    email: string | null;
    createdAt: string | null;
    lastSignInAt: string | null;
    emailConfirmedAt: string | null;
    appMetadata: Record<string, unknown> | null;
    userMetadata: Record<string, unknown> | null;
  } | null;
  profile: {
    id: string;
    email: string | null;
    fullName: string | null;
    role: string | null;
    suspended: boolean;
    createdAt: string | null;
  } | null;
  session: { expiresAt: string | null; provider: string | null; tokenBytes: number | null };
  cookies: { name: string; bytes: number }[];
};

function Json({ value }: { value: unknown }) {
  return (
    <pre className="rounded-xl bg-[var(--dev-surface-sunken)] border border-[var(--dev-hairline)] p-3.5 text-[11.5px] font-mono text-[var(--dev-text-secondary)] overflow-x-auto leading-relaxed">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

export default function DevSessionPage() {
  const { data, error, loading, refreshing, refresh } =
    useDevResource<SessionPayload>("/api/dev/session");

  const expired =
    data?.session.expiresAt && new Date(data.session.expiresAt).getTime() < Date.now();

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 space-y-7 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Dev Console"
        title="Session Inspector"
        description="Your current identity as the server sees it — useful when debugging auth, roles, or redirect loops."
        action={<RefreshButton onClick={refresh} busy={loading || refreshing} />}
      />

      {error && <ErrorNote message={error} />}
      {loading && <Loading label="Resolving session…" />}

      {data && (
        <>
          <Panel
            title="Session"
            action={
              expired ? <Pill tone="fail">expired</Pill> : <Pill tone="ok">active</Pill>
            }
          >
            <Row label="Access token expires">
              {data.session.expiresAt
                ? new Date(data.session.expiresAt).toLocaleString()
                : "—"}
            </Row>
            <Row label="Provider">{data.session.provider ?? "—"}</Row>
            <Row label="Token size">
              {data.session.tokenBytes ? `${data.session.tokenBytes} bytes` : "—"}
            </Row>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Auth user">
              {data.user ? (
                <>
                  <Row label="ID">{data.user.id}</Row>
                  <Row label="Email">{data.user.email ?? "—"}</Row>
                  <Row label="Email confirmed">
                    {data.user.emailConfirmedAt
                      ? new Date(data.user.emailConfirmedAt).toLocaleString()
                      : "not confirmed"}
                  </Row>
                  <Row label="Last sign-in">
                    {data.user.lastSignInAt
                      ? new Date(data.user.lastSignInAt).toLocaleString()
                      : "—"}
                  </Row>
                  <Row label="Created">
                    {data.user.createdAt
                      ? new Date(data.user.createdAt).toLocaleString()
                      : "—"}
                  </Row>
                </>
              ) : (
                <Empty label="No authenticated user." />
              )}
            </Panel>

            <Panel
              title="Profile row"
              action={
                data.profile?.role ? <Pill tone="info">{data.profile.role}</Pill> : undefined
              }
            >
              {data.profile ? (
                <>
                  <Row label="ID">{data.profile.id}</Row>
                  <Row label="Email">{data.profile.email ?? "—"}</Row>
                  <Row label="Name">{data.profile.fullName ?? "—"}</Row>
                  <Row label="Role">{data.profile.role ?? "—"}</Row>
                  <Row label="Suspended">{data.profile.suspended ? "yes" : "no"}</Row>
                </>
              ) : (
                <Empty label="No matching profiles row." />
              )}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="app_metadata">
              <Json value={data.user?.appMetadata} />
            </Panel>
            <Panel title="user_metadata">
              <Json value={data.user?.userMetadata} />
            </Panel>
          </div>

          <Panel
            title="Cookies"
            subtitle="Names and sizes only — values are never returned to the browser"
          >
            {data.cookies.length === 0 ? (
              <Empty label="No cookies on this request." />
            ) : (
              <div className="divide-y divide-[var(--dev-hairline)]">
                {data.cookies.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-[12.5px] font-mono text-[var(--dev-text)] break-all tracking-[-0.01em]">
                      {c.name}
                    </span>
                    <span className="text-[11.5px] text-[var(--dev-text-tertiary)] tabular-nums shrink-0">
                      {c.bytes} bytes
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
