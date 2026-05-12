/**
 * Open a dedicated print window with isolated HTML content.
 * Avoids the fragility of window.print() against @media print rules
 * fighting the rest of the SPA / dialog overlays.
 */
export function printHtmlDocument(opts: {
  title: string;
  bodyHtml: string;
  fontFamily?: string;
  googleFontFamily?: string; // e.g. "Cairo:wght@400;600;700"
  brandColor?: string;
}) {
  const {
    title,
    bodyHtml,
    fontFamily = "'Cairo','Segoe UI',Tahoma,Arial,sans-serif",
    googleFontFamily,
    brandColor = '#1e40af',
  } = opts;

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    // Popup blocked — fall back to window.print()
    window.print();
    return;
  }

  const fontLink = googleFontFamily
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${googleFontFamily}&display=swap" />`
    : '';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${title}</title>
${fontLink}
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: ${fontFamily}; }
  body { padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  @page { size: A4; margin: 10mm; }
  @media print {
    .no-print { display: none !important; }
  }
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; gap: 8px; justify-content: flex-end;
    padding: 12px 16px; background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  .toolbar button {
    font-family: inherit; font-size: 14px; cursor: pointer;
    padding: 8px 16px; border-radius: 6px; border: 1px solid ${brandColor};
    background: ${brandColor}; color: #fff;
  }
  .toolbar button.secondary { background: #fff; color: ${brandColor}; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button class="secondary" onclick="window.close()">إغلاق</button>
    <button onclick="window.print()">طباعة</button>
  </div>
  ${bodyHtml}
  <script>
    window.addEventListener('load', function () {
      // Wait for fonts to load before triggering print
      var ready = (document.fonts && document.fonts.ready) || Promise.resolve();
      ready.then(function () {
        setTimeout(function () { window.focus(); window.print(); }, 250);
      });
    });
    window.addEventListener('afterprint', function () {
      // Keep window open so user can re-print or close manually
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
