import { isLocalFontAvailable, SAFE_ARABIC_FONT_STACK } from './arabicFont';

/**
 * Open a dedicated print window with isolated HTML content.
 * Includes a built-in preview toolbar with paper size + orientation controls.
 *
 * Font strategy (local-first with safe fallback):
 *   1. If `localFontUrl` exists at /fonts/..., inject @font-face for it.
 *   2. Otherwise, load the matching family from Google Fonts via <link>.
 *   3. CSS font-family always ends with a system Arabic-capable stack so
 *      text remains readable even when both 1 and 2 fail (offline / blocked).
 */
export type PaperSize = 'A4' | 'A5' | 'Letter' | 'Legal';
export type PaperOrientation = 'portrait' | 'landscape';

export async function printHtmlDocument(opts: {
  title: string;
  bodyHtml: string;
  fontFamily?: string;            // primary family name, e.g. "Cairo"
  localFontUrl?: string;          // e.g. "/fonts/Cairo-Regular.ttf"
  googleFontFamily?: string;      // e.g. "Cairo:wght@400;600;700"
  brandColor?: string;
  defaultPaperSize?: PaperSize;
  defaultOrientation?: PaperOrientation;
  autoPrint?: boolean;
}) {
  const {
    title,
    bodyHtml,
    fontFamily,
    localFontUrl,
    googleFontFamily,
    brandColor = '#1e40af',
    defaultPaperSize = 'A4',
    defaultOrientation = 'portrait',
    autoPrint = false,
  } = opts;

  // Decide local vs remote BEFORE writing the document so the head is final.
  const useLocal = !!localFontUrl && (await isLocalFontAvailable(localFontUrl));
  const primaryFamily = fontFamily || 'Cairo';
  const fullFontFamily = `'${primaryFamily}', ${SAFE_ARABIC_FONT_STACK}`;

  const printWindow = window.open('', '_blank', 'width=1100,height=1000');
  if (!printWindow) {
    window.print();
    return;
  }

  const fontLink = googleFontFamily
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${googleFontFamily}&display=swap" />`
    : '';

  // Approximate pixel sizes at 96dpi for on-screen preview pages
  const PAPER_PX: Record<PaperSize, { w: number; h: number }> = {
    A4: { w: 794, h: 1123 },
    A5: { w: 559, h: 794 },
    Letter: { w: 816, h: 1056 },
    Legal: { w: 816, h: 1344 },
  };

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${title}</title>
${fontLink}
<style id="base-style">
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #e5e7eb; color: #000; font-family: ${fontFamily}; }
  table { border-collapse: collapse; width: 100%; }
  .toolbar {
    position: sticky; top: 0; z-index: 100;
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
    justify-content: flex-end;
    padding: 10px 16px; background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 14px;
  }
  .toolbar label { display: inline-flex; align-items: center; gap: 6px; color: #334155; }
  .toolbar select {
    font-family: inherit; font-size: 14px; padding: 6px 10px;
    border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; color: #0f172a;
  }
  .toolbar button {
    font-family: inherit; font-size: 14px; cursor: pointer;
    padding: 8px 16px; border-radius: 6px; border: 1px solid ${brandColor};
    background: ${brandColor}; color: #fff;
  }
  .toolbar button.secondary { background: #fff; color: ${brandColor}; }
  .preview-wrap {
    display: flex; justify-content: center; padding: 24px;
  }
  .page {
    background: #fff; box-shadow: 0 4px 24px rgba(0,0,0,.12);
    margin: 0 auto; padding: 12mm;
    transition: width .15s ease, min-height .15s ease;
  }
  @page { size: ${defaultPaperSize} ${defaultOrientation}; margin: 10mm; }
  @media print {
    html, body { background: #fff; }
    .no-print { display: none !important; }
    .preview-wrap { padding: 0; }
    .page { box-shadow: none; padding: 0; width: auto !important; min-height: 0 !important; }
  }
</style>
<style id="page-size-style"></style>
</head>
<body>
  <div class="toolbar no-print">
    <label>حجم الورق:
      <select id="paperSize">
        <option value="A4">A4</option>
        <option value="A5">A5</option>
        <option value="Letter">Letter</option>
        <option value="Legal">Legal</option>
      </select>
    </label>
    <label>الاتجاه:
      <select id="orientation">
        <option value="portrait">عمودي</option>
        <option value="landscape">أفقي</option>
      </select>
    </label>
    <button class="secondary" onclick="window.close()">إغلاق</button>
    <button onclick="window.print()">طباعة</button>
  </div>
  <div class="preview-wrap">
    <div class="page" id="printPage">
      ${bodyHtml}
    </div>
  </div>
  <script>
    (function () {
      var PAPER = ${JSON.stringify(PAPER_PX)};
      var sizeSel = document.getElementById('paperSize');
      var orSel = document.getElementById('orientation');
      var pageStyle = document.getElementById('page-size-style');
      var pageEl = document.getElementById('printPage');
      sizeSel.value = ${JSON.stringify(defaultPaperSize)};
      orSel.value = ${JSON.stringify(defaultOrientation)};

      function apply() {
        var size = sizeSel.value;
        var or = orSel.value;
        var dims = PAPER[size] || PAPER.A4;
        var w = or === 'landscape' ? dims.h : dims.w;
        var h = or === 'landscape' ? dims.w : dims.h;
        pageEl.style.width = w + 'px';
        pageEl.style.minHeight = h + 'px';
        pageStyle.innerHTML = '@page { size: ' + size + ' ' + or + '; margin: 10mm; }';
      }
      sizeSel.addEventListener('change', apply);
      orSel.addEventListener('change', apply);
      apply();

      window.addEventListener('load', function () {
        var ready = (document.fonts && document.fonts.ready) || Promise.resolve();
        ready.then(function () {
          ${autoPrint ? "setTimeout(function(){ window.focus(); window.print(); }, 300);" : "window.focus();"}
        });
      });
    })();
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
