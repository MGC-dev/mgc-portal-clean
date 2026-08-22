"use client";

/**
 * Finder-style file and folder glyphs, drawn inline as SVG rather than pulled
 * from an icon set — stroke icons read as line art next to real content, and
 * these need the solid, slightly playful weight macOS uses.
 */

const TYPE_COLOR: Record<string, string> = {
  pdf: "#e5484d",
  doc: "#3b6fd4",
  docx: "#3b6fd4",
  xls: "#1e9e63",
  xlsx: "#1e9e63",
  csv: "#1e9e63",
  ppt: "#e07b39",
  pptx: "#e07b39",
  png: "#8b5cf6",
  jpg: "#8b5cf6",
  jpeg: "#8b5cf6",
  gif: "#8b5cf6",
  svg: "#8b5cf6",
  webp: "#8b5cf6",
  zip: "#8a8a8e",
  txt: "#6e6e73",
};

export function typeColor(ext: string): string {
  return TYPE_COLOR[(ext || "").toLowerCase()] || "#8a8a8e";
}

/** macOS-style two-tone folder. */
export function FolderGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size * (22 / 26)} viewBox="0 0 26 22" fill="none" aria-hidden="true">
      {/* Back panel, slightly darker, peeking above the front. */}
      <path
        d="M1 5.2A3.2 3.2 0 0 1 4.2 2h5.4a2 2 0 0 1 1.5.7l1.5 1.7h9.2A3.2 3.2 0 0 1 25 7.6v9.2A3.2 3.2 0 0 1 21.8 20H4.2A3.2 3.2 0 0 1 1 16.8z"
        fill="#4a9ae8"
      />
      {/* Front panel with a soft highlight, giving the folder its depth. */}
      <path
        d="M1 8.4A2.4 2.4 0 0 1 3.4 6h19.2A2.4 2.4 0 0 1 25 8.4v8.4A3.2 3.2 0 0 1 21.8 20H4.2A3.2 3.2 0 0 1 1 16.8z"
        fill="url(#folderFront)"
      />
      <defs>
        <linearGradient id="folderFront" x1="13" y1="6" x2="13" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#77bcf7" />
          <stop offset="1" stopColor="#59a6ef" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * A sheet with a folded corner and, when the extension is known, a coloured
 * badge naming it — the same trick Finder and Quick Look use to make file kinds
 * scannable without a legend.
 */
export function FileGlyph({ ext, size = 22 }: { ext: string; size?: number }) {
  const label = (ext || "").toUpperCase().slice(0, 4);
  const color = typeColor(ext);
  const w = size * (22 / 26);
  return (
    <svg width={w} height={size} viewBox="0 0 22 26" fill="none" aria-hidden="true">
      <path
        d="M3 3.2A2.2 2.2 0 0 1 5.2 1h8.1L20 7.7v15.1A2.2 2.2 0 0 1 17.8 25H5.2A2.2 2.2 0 0 1 3 22.8z"
        fill="#ffffff"
        stroke="#d7d7dc"
        strokeWidth="1"
      />
      {/* Folded corner */}
      <path d="M13.3 1 20 7.7h-4.5a2.2 2.2 0 0 1-2.2-2.2z" fill="#e8e8ec" />
      {label && (
        <>
          {/* The badge has to carry readable text at ~26px, so it runs nearly
              the full width of the sheet and the label is sized in viewBox
              units that survive the downscale. */}
          <rect x="0.5" y="13" width="17" height="9.5" rx="2.5" fill={color} />
          <text
            x="9"
            y="19.9"
            textAnchor="middle"
            fontSize={label.length > 3 ? 6.2 : 7.4}
            fontWeight="700"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
            letterSpacing="-0.1"
          >
            {label}
          </text>
        </>
      )}
    </svg>
  );
}

export function ItemGlyph({
  isFolder,
  ext,
  size = 22,
}: {
  isFolder?: boolean;
  ext: string;
  size?: number;
}) {
  return isFolder ? <FolderGlyph size={size} /> : <FileGlyph ext={ext} size={size} />;
}
