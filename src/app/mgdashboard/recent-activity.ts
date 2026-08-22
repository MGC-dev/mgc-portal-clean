import type React from "react";
import { FileSignature, FilePlus2, FolderOpen, MessageSquarePlus } from "lucide-react";

export interface ActivityItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  href: string;
}

/** Only the last day counts as "recent" — older items live on their own pages. */
const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Merges contracts, uploads, admin-shared WorkDrive files and support tickets
 * into one time-ordered feed. Each source is optional: a failing endpoint drops
 * its own items rather than emptying the feed.
 */
export async function loadRecentActivity(limit = 6): Promise<ActivityItem[]> {
  try {
      const results: ActivityItem[] = [];

      // Contracts
      const contractsRes = await fetch("/api/contracts/list", { credentials: "include" }).catch(() => null);
      if (contractsRes?.ok) {
        const json = await contractsRes.json().catch(() => ({}));
        const contracts: any[] = json?.contracts || json?.data || [];
        contracts.slice(0, 3).forEach((c) => {
          const isSigned = c.status === "signed" || c.status === "completed";
          results.push({
            id: `contract-${c.id}`,
            icon: FileSignature,
            iconColor: isSigned ? "text-green-600" : "text-[#264f5e]",
            iconBg: isSigned ? "bg-green-100" : "bg-[#264f5e]/10",
            title: isSigned ? `Contract signed` : `Contract ready to sign`,
            description: c.title || c.name || "Service Agreement",
            time: c.updated_at || c.created_at,
            href: "/mgdashboard/contracts",
          });
        });
      }

      // Client-uploaded documents
      const docsRes = await fetch("/api/client/documents", { credentials: "include" }).catch(() => null);
      if (docsRes?.ok) {
        const json = await docsRes.json().catch(() => ({}));
        const docs: any[] = json?.documents || json?.data || [];
        docs.slice(0, 3).forEach((d) => {
          results.push({
            id: `doc-${d.id}`,
            icon: FilePlus2,
            iconColor: "text-[#264f5e]",
            iconBg: "bg-[#264f5e]/10",
            title: "Document uploaded",
            description: d.title || d.name || "Uploaded file",
            time: d.created_at,
            href: "/mgdashboard/documents",
          });
        });
      }

      // Admin-shared documents (WorkDrive)
      const wdRes = await fetch("/api/workdrive/files", { credentials: "include" }).catch(() => null);
      if (wdRes?.ok) {
        const json = await wdRes.json().catch(() => ({}));
        const rootItems: any[] = json?.files || [];

        // Collect all items: root-level files + files inside subfolders (1 level deep)
        const allItems: any[] = [];

        for (const item of rootItems) {
          if (!item.is_folder) {
            allItems.push({ ...item, _source: "root" });
          } else {
            // Fetch inside this subfolder
            const subRes = await fetch(
              `/api/workdrive/files?folderId=${encodeURIComponent(item.id)}`,
              { credentials: "include" }
            ).catch(() => null);
            if (subRes?.ok) {
              const subJson = await subRes.json().catch(() => ({}));
              const subFiles: any[] = (subJson?.files || []).filter((f: any) => !f.is_folder);
              subFiles.forEach((f: any) => allItems.push({ ...f, _folderName: item.name }));
            }
          }
        }

        // Sort by created_time descending and take top 4
        allItems
          .sort((a, b) => Number(b.created_time || 0) - Number(a.created_time || 0))
          .slice(0, 4)
          .forEach((f) => {
            results.push({
              id: `wd-${f.id}`,
              icon: FolderOpen,
              iconColor: "text-[#264f5e]",
              iconBg: "bg-[#264f5e]/10",
              title: "Document shared by admin",
              description: f._folderName ? `${f.name} (in ${f._folderName})` : f.name || "Shared file",
              time: f.created_time ? new Date(Number(f.created_time)).toISOString() : new Date().toISOString(),
              href: "/mgdashboard/documents",
            });
          });
      }

      // Support tickets
      const supportRes = await fetch("/api/support/recent", { credentials: "include" }).catch(() => null);
      if (supportRes?.ok) {
        const json = await supportRes.json().catch(() => ({}));
        const tickets: any[] = json?.data || [];
        tickets.slice(0, 2).forEach((t) => {
          const isResolved = t.status === "resolved";
          results.push({
            id: `ticket-${t.id}`,
            icon: MessageSquarePlus,
            iconColor: isResolved ? "text-green-600" : "text-amber-600",
            iconBg: isResolved ? "bg-green-100" : "bg-amber-100",
            title: isResolved ? "Support ticket resolved" : "Support ticket submitted",
            description: t.subject || "Support request",
            time: t.created_at,
            href: "/mgdashboard/questions",
          });
        });
      }


    const cutoff = Date.now() - WINDOW_MS;
    return results
      .filter((r) => new Date(r.time).getTime() >= cutoff)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}
