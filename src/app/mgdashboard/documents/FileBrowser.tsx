"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, RefreshCw, Search, ArrowUpDown, FolderOpen } from "lucide-react";
import { ItemGlyph } from "./FileGlyphs";

export type WorkDriveFile = {
  id: string;
  name: string;
  extn: string;
  size: number;
  created_time: number;
  modified_time: number;
  type: string;
  permalink: string;
  is_folder?: boolean;
};

type SortColumn = "name" | "size" | "kind" | "date";

const KIND_LABELS: Record<string, string> = {
  pdf: "PDF Document",
  doc: "Word Document",
  docx: "Word Document",
  xls: "Excel Spreadsheet",
  xlsx: "Excel Spreadsheet",
  csv: "CSV Document",
  ppt: "Presentation",
  pptx: "Presentation",
  png: "PNG Image",
  jpg: "JPEG Image",
  jpeg: "JPEG Image",
  gif: "GIF Image",
  svg: "SVG Image",
  webp: "WebP Image",
  zip: "ZIP Archive",
  txt: "Plain Text",
};

export function kindLabel(f: { is_folder?: boolean; extn: string }): string {
  if (f.is_folder) return "Folder";
  const ext = (f.extn || "").toLowerCase();
  return KIND_LABELS[ext] || (ext ? `${ext.toUpperCase()} File` : "Document");
}

export function formatBytes(bytes: number): string {
  if (!+bytes) return "—";
  const k = 1024;
  const sizes = ["bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const n = bytes / Math.pow(k, i);
  return `${i === 0 ? n : n.toFixed(n < 10 ? 1 : 0)} ${sizes[i]}`;
}

function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FileBrowser({
  onOpenFile,
  toolbarExtra,
}: {
  onOpenFile: (file: WorkDriveFile, parentFolderId: string) => void;
  /** Rendered at the far left of the toolbar row; search and actions sit right. */
  toolbarExtra?: React.ReactNode;
}) {
  const [files, setFiles] = useState<WorkDriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rootFolderId, setRootFolderId] = useState<string>("");
  const [currentFolderId, setCurrentFolderId] = useState<string>("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ column: SortColumn; dir: "asc" | "desc" }>({
    column: "name",
    dir: "asc",
  });
  // Double-click means nothing on a touch screen, so a single tap opens there.
  const [isTouch, setIsTouch] = useState(false);

  // Folders expanded in place via the disclosure triangle, and their contents.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [childrenByFolder, setChildrenByFolder] = useState<Record<string, WorkDriveFile[]>>({});
  const [loadingChildren, setLoadingChildren] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const load = useCallback(async (folderId?: string) => {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    try {
      const url = folderId ? `/api/workdrive/files?folderId=${encodeURIComponent(folderId)}` : "/api/workdrive/files";
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || "Failed to load files");
      setFiles((json?.files || []) as WorkDriveFile[]);
      setCurrentFolderId(json?.folderId || "");
      setRootFolderId((prev) => prev || json?.rootFolderId || json?.folderId || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Disclosure triangle: reveal a folder's contents without leaving this view. */
  async function toggleExpand(folder: WorkDriveFile) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
      return next;
    });

    // Fetch once, then serve from cache when it is re-opened.
    if (childrenByFolder[folder.id] || expanded.has(folder.id)) return;
    setLoadingChildren(folder.id);
    try {
      const res = await fetch(`/api/workdrive/files?folderId=${encodeURIComponent(folder.id)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load folder");
      setChildrenByFolder((prev) => ({ ...prev, [folder.id]: (json?.files || []) as WorkDriveFile[] }));
    } catch {
      // Collapse again rather than leaving a row open and permanently empty.
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(folder.id);
        return next;
      });
    } finally {
      setLoadingChildren(null);
    }
  }

  function open(f: WorkDriveFile, parentId: string) {
    // Folders expand in place; only files leave this view.
    if (f.is_folder) toggleExpand(f);
    else onOpenFile(f, parentId);
  }

  function reload() {
    setExpanded(new Set());
    setChildrenByFolder({});
    load();
  }

  function toggleSort(column: SortColumn) {
    setSort((prev) =>
      prev.column === column
        ? { column, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { column, dir: "asc" }
    );
  }

  const sortFiles = useCallback(
    (list: WorkDriveFile[]) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      return [...list].sort((a, b) => {
        // Folders group first regardless of column, as in Finder.
        if (!!a.is_folder !== !!b.is_folder) return a.is_folder ? -1 : 1;
        if (sort.column === "size") return ((a.size || 0) - (b.size || 0)) * dir;
        if (sort.column === "date") return ((a.modified_time || 0) - (b.modified_time || 0)) * dir;
        if (sort.column === "kind") return kindLabel(a).localeCompare(kindLabel(b)) * dir;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }) * dir;
      });
    },
    [sort]
  );

  /**
   * Flattened rows, with each expanded folder's contents spliced in beneath it.
   *
   * `parentId` travels with every row because a file revealed by expanding a
   * folder does not live in the folder currently open — and the download API
   * verifies a file sits inside the folder id it is handed, so passing the
   * open folder would 404 for nested files.
   */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const here = currentFolderId || rootFolderId;

    // While searching, show flat matches — nesting only obscures the results.
    if (q) {
      return sortFiles(files.filter((f) => f.name.toLowerCase().includes(q))).map((file) => ({
        file,
        depth: 0,
        parentId: here,
      }));
    }

    const build = (
      list: WorkDriveFile[],
      parentId: string,
      depth: number
    ): { file: WorkDriveFile; depth: number; parentId: string }[] => {
      const out: { file: WorkDriveFile; depth: number; parentId: string }[] = [];
      for (const file of sortFiles(list)) {
        out.push({ file, depth, parentId });
        if (file.is_folder && expanded.has(file.id)) {
          const kids = childrenByFolder[file.id];
          if (kids?.length) out.push(...build(kids, file.id, depth + 1));
        }
      }
      return out;
    };
    return build(files, here, 0);
  }, [files, query, sortFiles, expanded, childrenByFolder, currentFolderId, rootFolderId]);

  const selectedRow = rows.find((r) => r.file.id === selectedId) || null;
  const selected = selectedRow?.file || null;
  const isSearching = query.trim().length > 0;

  const SortHeader = ({ column, label, className }: { column: SortColumn; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(column)}
      className={`flex items-center gap-1 text-[12px] font-medium tracking-[-0.005em] transition-colors ${
        sort.column === column ? "text-[#1d1d1f]" : "text-gray-400 hover:text-gray-600"
      } ${className || ""}`}
    >
      {label}
      {sort.column === column ? (
        <span className="text-[8px] leading-none">{sort.dir === "asc" ? "▲" : "▼"}</span>
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/head:opacity-40" />
      )}
    </button>
  );

  return (
    <section>
      {/* ── Toolbar: search + actions. No title — the page heading above
             already says "My Documents"; a second one just repeated it. ── */}
      <div className="pt-1 pb-3 flex items-center justify-between gap-3">
        {toolbarExtra}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full sm:w-40 pl-8 pr-3 py-1.5 text-[13px] rounded-lg bg-black/[0.04] border border-transparent placeholder:text-gray-400 focus:bg-white focus:border-black/[0.12] focus:outline-none transition-colors"
            />
          </div>

          {selected ? (
            <a
              href={
                selected.is_folder
                  ? `/api/workdrive/download?fileId=${selected.id}&isFolder=true&folderId=${encodeURIComponent(selectedRow!.parentId)}`
                  : `/api/workdrive/download?fileId=${selected.id}&folderId=${encodeURIComponent(selectedRow!.parentId)}`
              }
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#264f5e] text-white text-[13px] font-medium hover:bg-[#1f424e] transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          ) : (
            currentFolderId && (
              <a
                href={`/api/workdrive/download?fileId=${currentFolderId}&isFolder=true&folderId=${encodeURIComponent(
                  rootFolderId
                )}`}
                download
                title="Download this folder as a ZIP"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.12] text-[13px] font-medium text-[#1d1d1f] hover:bg-black/[0.03] transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ZIP</span>
              </a>
            )
          )}

          <button
            onClick={reload}
            title="Refresh"
            className="p-2 rounded-lg text-gray-500 hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Column headers ── */}
      <div className="group/head flex items-center gap-3 px-3 py-2 border-b border-black/[0.08]">
        <div className="flex-1 min-w-0">
          <SortHeader column="name" label="Name" />
        </div>
        <div className="w-28 hidden lg:block">
          <SortHeader column="date" label="Date" />
        </div>
        <div className="w-24 flex justify-end">
          <SortHeader column="size" label="Size" />
        </div>
        <div className="w-36 hidden md:block">
          <SortHeader column="kind" label="Kind" />
        </div>
      </div>

      {/* ── Rows ── */}
      <div className="min-h-[280px]" onClick={() => setSelectedId(null)}>
        {loading ? (
          <div className="animate-pulse space-y-1 pt-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-[22px] h-[22px] rounded bg-black/[0.06]" />
                <div className="h-3 rounded-full bg-black/[0.05] flex-1 max-w-[280px]" />
                <div className="h-3 rounded-full bg-black/[0.04] w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[14px] font-medium text-[#1d1d1f]">Couldn't load your files</p>
            <p className="text-[13px] text-gray-500 mt-1">{error}</p>
            <button
              onClick={reload}
              className="mt-4 px-3.5 py-1.5 rounded-lg bg-[#264f5e] text-white text-[13px] font-medium hover:bg-[#1f424e] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="opacity-30 mb-3">
              {isSearching ? <Search className="w-8 h-8 text-gray-400" /> : <FolderOpen className="w-9 h-9 text-gray-400" />}
            </div>
            <p className="text-[14px] font-medium text-[#1d1d1f]">
              {isSearching ? `No files matching "${query}"` : "This folder is empty"}
            </p>
            <p className="text-[13px] text-gray-500 mt-1">
              {isSearching ? "Try a different search." : "Files shared by our team will appear here."}
            </p>
          </div>
        ) : (
          <div>
            {rows.map(({ file: f, depth, parentId }) => {
              const isSelected = selectedId === f.id;
              const isExpanded = expanded.has(f.id);
              return (
                <div
                  key={`${parentId}/${f.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTouch) open(f, parentId);
                    else setSelectedId(f.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    open(f, parentId);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      open(f, parentId);
                    }
                    // Finder's arrow keys: right opens a folder, left closes it.
                    if (f.is_folder && e.key === "ArrowRight" && !isExpanded) {
                      e.preventDefault();
                      toggleExpand(f);
                    }
                    if (f.is_folder && e.key === "ArrowLeft" && isExpanded) {
                      e.preventDefault();
                      toggleExpand(f);
                    }
                  }}
                  aria-label={`${f.name}, ${kindLabel(f)}. ${isTouch ? "Tap" : "Double-click"} to open.`}
                  aria-expanded={f.is_folder ? isExpanded : undefined}
                  title={f.name}
                  className={`group flex items-center gap-3 px-3 py-3 border-b border-black/[0.05] cursor-default select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#264f5e]/40 ${
                    isSelected ? "bg-[#264f5e]" : "hover:bg-black/[0.025]"
                  }`}
                >
                  {/* Nesting indent */}
                  <span style={{ width: depth * 18 }} className="shrink-0" />

                  {/* Disclosure triangle — folders only; files get a spacer so
                      their glyphs stay aligned with the folders above them. */}
                  {f.is_folder && !isSearching ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(f);
                      }}
                      aria-label={isExpanded ? `Collapse ${f.name}` : `Expand ${f.name}`}
                      className={`shrink-0 w-5 h-5 -mr-1 flex items-center justify-center rounded transition-colors ${
                        isSelected ? "text-white/80 hover:bg-white/15" : "text-gray-400 hover:text-[#1d1d1f] hover:bg-black/[0.06]"
                      }`}
                    >
                      {loadingChildren === f.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                          strokeWidth={2.75}
                        />
                      )}
                    </button>
                  ) : (
                    <span className="shrink-0 w-5 -mr-1" />
                  )}

                  <span className="shrink-0 flex items-center justify-center w-[26px]">
                    <ItemGlyph isFolder={f.is_folder} ext={f.extn} size={26} />
                  </span>

                  <span
                    className={`flex-1 min-w-0 truncate text-[14px] tracking-[-0.005em] ${
                      isSelected ? "text-white font-medium" : "text-[#1d1d1f]"
                    }`}
                  >
                    {f.name}
                  </span>

                  <span
                    className={`w-28 shrink-0 hidden lg:block text-[13px] tabular-nums ${
                      isSelected ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {formatDate(f.modified_time)}
                  </span>
                  <span
                    className={`w-24 text-right shrink-0 text-[13px] tabular-nums ${
                      isSelected ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {f.is_folder ? "" : formatBytes(f.size)}
                  </span>
                  <span
                    className={`w-36 shrink-0 hidden md:block truncate text-[13px] ${
                      isSelected ? "text-white/70" : "text-gray-500"
                    }`}
                  >
                    {kindLabel(f)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
}
