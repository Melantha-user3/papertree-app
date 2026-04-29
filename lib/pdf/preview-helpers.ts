function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildFallbackCoverDataUrl(title: string, subtitle = "PaperTree preview") {
  const safeTitle = escapeXml(title.slice(0, 56) || "Untitled paper");
  const safeSubtitle = escapeXml(subtitle);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 600 840">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#dbeafe" />
    </linearGradient>
  </defs>
  <rect width="600" height="840" rx="36" fill="url(#bg)" />
  <rect x="42" y="42" width="516" height="756" rx="28" fill="#ffffff" stroke="#dbe4ee" />
  <circle cx="92" cy="104" r="11" fill="#14b8a6" />
  <text x="118" y="112" fill="#0f172a" font-size="20" font-family="Arial, sans-serif">PaperTree</text>
  <text x="68" y="190" fill="#0f172a" font-size="34" font-weight="700" font-family="Arial, sans-serif">${safeTitle}</text>
  <text x="68" y="248" fill="#475569" font-size="20" font-family="Arial, sans-serif">${safeSubtitle}</text>
  <rect x="68" y="306" width="464" height="2" fill="#e2e8f0" />
  <rect x="68" y="360" width="390" height="16" rx="8" fill="#dbeafe" />
  <rect x="68" y="402" width="442" height="16" rx="8" fill="#e2e8f0" />
  <rect x="68" y="444" width="416" height="16" rx="8" fill="#e2e8f0" />
  <rect x="68" y="528" width="464" height="194" rx="22" fill="#eff6ff" />
  <rect x="106" y="566" width="388" height="118" rx="18" fill="#dbeafe" />
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function buildPdfPreviewUrl(pdfUrl: string) {
  const hashSeparator = pdfUrl.includes("#") ? "&" : "#";
  return `${pdfUrl}${hashSeparator}page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
}
