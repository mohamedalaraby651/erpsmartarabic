// Arabic font support for PDF generation
// Supports multiple fonts: Cairo, Amiri, Noto Sans Arabic, Tajawal

export type PdfFontKey = 'cairo' | 'amiri' | 'noto-sans-arabic' | 'tajawal';

export interface FontConfig {
  key: PdfFontKey;
  name: string;
  displayName: string;
  arabicName: string;
  description: string;
  urls: string[];
  googleFontFamily: string;
}

export const AVAILABLE_FONTS: FontConfig[] = [
  {
    key: 'amiri',
    name: 'Amiri',
    displayName: 'Amiri',
    arabicName: 'أميري',
    description: 'خط كلاسيكي نسخي - الأفضل لتصدير PDF (يدعم كل الحروف)',
    urls: [
      'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/amiri/Amiri-Regular.ttf',
    ],
    googleFontFamily: 'Amiri:wght@400;700',
  },
  {
    key: 'cairo',
    name: 'Cairo',
    displayName: 'Cairo',
    arabicName: 'القاهرة',
    description: 'خط حديث وواضح - قد لا يعرض بعض الحروف في PDF',
    urls: [
      'https://cdn.jsdelivr.net/gh/Gue3bara/Cairo@7030db78/fonts/ttf/Cairo-Regular.ttf',
    ],
    googleFontFamily: 'Cairo:wght@400;500;600;700',
  },
  {
    key: 'noto-sans-arabic',
    name: 'NotoSansArabic',
    displayName: 'Noto Sans Arabic',
    arabicName: 'نوتو سانس',
    description: 'خط Google الشامل - توافقية قصوى',
    urls: [
      'https://fonts.gstatic.com/s/notosansarabic/v28/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyG2vu3CBFQLaig.ttf',
    ],
    googleFontFamily: 'Noto+Sans+Arabic:wght@400;500;600;700',
  },
  {
    key: 'tajawal',
    name: 'Tajawal',
    displayName: 'Tajawal',
    arabicName: 'تجوال',
    description: 'خط عصري خفيف - مناسب للعروض التقديمية',
    urls: [
      'https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1rzaLCr5IlLA.ttf',
      'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-Regular.ttf',
    ],
    googleFontFamily: 'Tajawal:wght@400;500;700',
  },
];

// Default font name used in jsPDF
export let ARABIC_FONT_NAME = 'Amiri';

export function getFontConfig(key: PdfFontKey): FontConfig {
  return AVAILABLE_FONTS.find(f => f.key === key) || AVAILABLE_FONTS[0];
}

// Load font from URL and return base64
export async function loadArabicFont(fontKey: PdfFontKey = 'cairo'): Promise<string | null> {
  const config = getFontConfig(fontKey);
  
  if (config.urls.length === 0) {
    console.error(`[Font] Font "${config.name}" has no URLs configured`);
    return null;
  }
  
  for (const url of config.urls) {
    try {
      console.log(`[Font] Trying to load "${config.name}" from: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[Font] HTTP ${response.status} for: ${url}`);
        continue;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Validate file size (must be > 10KB to be a real font file)
      if (arrayBuffer.byteLength < 10000) {
        console.warn(`[Font] File too small (${arrayBuffer.byteLength} bytes), likely not a valid font:`, url);
        continue;
      }
      
      // Validate it starts with TTF/OTF magic bytes
      const header = new Uint8Array(arrayBuffer.slice(0, 4));
      const magic = (header[0] << 24) | (header[1] << 16) | (header[2] << 8) | header[3];
      if (magic !== 0x00010000 && magic !== 0x4F54544F) {
        console.warn(`[Font] Invalid TTF header (magic: 0x${magic.toString(16)}), skipping:`, url);
        continue;
      }
      
      // Warn if this is a Variable Font (has 'fvar' table) - jsPDF doesn't fully support them
      if (isVariableFont(arrayBuffer)) {
        console.warn(`[Font] ⚠️ "${config.name}" from ${url} is a Variable Font. jsPDF may render missing glyphs. Prefer static TTF.`);
      }
      
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      console.log(`[Font] ✅ "${config.name}" loaded successfully (${Math.round(arrayBuffer.byteLength / 1024)}KB)`);
      ARABIC_FONT_NAME = config.name;
      return base64;
    } catch (error) {
      console.warn('[Font] Failed to load from:', url, error);
      continue;
    }
  }
  
  console.error(`[Font] ❌ Failed to load "${config.name}" from all ${config.urls.length} sources`);
  return null;
}

// ===== Arabic Text Reshaping =====
// Arabic letters have 4 contextual forms: Isolated, Initial, Medial, Final
// This map uses Unicode Presentation Forms-B (U+FE70-U+FEFF)

// [isolated, final, initial, medial] - 0 means the form doesn't exist (use isolated)
const ARABIC_FORMS: Record<number, [number, number, number, number]> = {
  0x0621: [0xFE80, 0, 0, 0],
  0x0622: [0xFE81, 0xFE82, 0, 0],
  0x0623: [0xFE83, 0xFE84, 0, 0],
  0x0624: [0xFE85, 0xFE86, 0, 0],
  0x0625: [0xFE87, 0xFE88, 0, 0],
  0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C],
  0x0627: [0xFE8D, 0xFE8E, 0, 0],
  0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92],
  0x0629: [0xFE93, 0xFE94, 0, 0],
  0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98],
  0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C],
  0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0],
  0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4],
  0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8],
  0x062F: [0xFEA9, 0xFEAA, 0, 0],
  0x0630: [0xFEAB, 0xFEAC, 0, 0],
  0x0631: [0xFEAD, 0xFEAE, 0, 0],
  0x0632: [0xFEAF, 0xFEB0, 0, 0],
  0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4],
  0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8],
  0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC],
  0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0],
  0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4],
  0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8],
  0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC],
  0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0],
  0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4],
  0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8],
  0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC],
  0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0],
  0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4],
  0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8],
  0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC],
  0x0648: [0xFEED, 0xFEEE, 0, 0],
  0x0649: [0xFEEF, 0xFEF0, 0, 0],
  0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4],
  0x0640: [0x0640, 0x0640, 0x0640, 0x0640],
};

const LAM_ALEF_LIGATURES: Record<number, [number, number]> = {
  0x0622: [0xFEF5, 0xFEF6],
  0x0623: [0xFEF7, 0xFEF8],
  0x0625: [0xFEF9, 0xFEFA],
  0x0627: [0xFEFB, 0xFEFC],
};

const RIGHT_JOIN_ONLY = new Set([
  0x0621, 0x0622, 0x0623, 0x0624, 0x0625, 0x0627,
  0x062F, 0x0630, 0x0631, 0x0632, 0x0648, 0x0649, 0x0629,
]);

/**
 * Check if a font file is a Variable Font by looking for the 'fvar' table.
 */
function isVariableFont(buffer: ArrayBuffer): boolean {
  try {
    const view = new DataView(buffer);
    const numTables = view.getUint16(4);
    for (let i = 0; i < numTables && i < 100; i++) {
      const offset = 12 + i * 16;
      if (offset + 4 > buffer.byteLength) break;
      const tag = String.fromCharCode(
        view.getUint8(offset), view.getUint8(offset + 1),
        view.getUint8(offset + 2), view.getUint8(offset + 3)
      );
      if (tag === 'fvar') return true;
    }
  } catch { /* ignore parse errors */ }
  return false;
}

function isArabicLetter(code: number): boolean {
  return code >= 0x0621 && code <= 0x064A && ARABIC_FORMS[code] !== undefined;
}

function isArabicDiacritic(code: number): boolean {
  return code >= 0x064B && code <= 0x0652;
}

function isRtlChar(code: number): boolean {
  return (code >= 0x0600 && code <= 0x06FF) || 
         (code >= 0xFE70 && code <= 0xFEFF) || 
         (code >= 0xFB50 && code <= 0xFDFF);
}

function isArabicChar(code: number): boolean {
  return isRtlChar(code);
}

export function reshapeArabicText(text: string): string {
  if (!text) return text;
  if (!/[\u0600-\u06FF]/.test(text)) return text;

  const segments: { text: string; isArabic: boolean }[] = [];
  let currentSegment = '';
  let currentIsArabic = false;

  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].codePointAt(0) || 0;
    const charIsArabic = isArabicChar(code) || isArabicDiacritic(code);
    
    if (i === 0) {
      currentIsArabic = charIsArabic;
      currentSegment = chars[i];
    } else if (charIsArabic === currentIsArabic) {
      currentSegment += chars[i];
    } else {
      segments.push({ text: currentSegment, isArabic: currentIsArabic });
      currentSegment = chars[i];
      currentIsArabic = charIsArabic;
    }
  }
  if (currentSegment) {
    segments.push({ text: currentSegment, isArabic: currentIsArabic });
  }

  const result = segments.map(seg => {
    if (!seg.isArabic) return seg.text;
    return reshapeArabicSegment(seg.text);
  });

  return result.join('');
}

function reshapeArabicSegment(text: string): string {
  const chars: number[] = [];
  const diacritics: Map<number, number[]> = new Map();
  
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (isArabicDiacritic(code)) {
      if (chars.length > 0) {
        const lastIdx = chars.length - 1;
        if (!diacritics.has(lastIdx)) diacritics.set(lastIdx, []);
        diacritics.get(lastIdx)!.push(code);
      }
    } else {
      chars.push(code);
    }
  }

  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const code = chars[i];
    
    if (!isArabicLetter(code)) {
      result.push(String.fromCharCode(code));
      if (diacritics.has(i)) {
        result.push(...diacritics.get(i)!.map(d => String.fromCharCode(d)));
      }
      continue;
    }

    if (code === 0x0644 && i + 1 < chars.length && LAM_ALEF_LIGATURES[chars[i + 1]]) {
      const alefCode = chars[i + 1];
      const ligature = LAM_ALEF_LIGATURES[alefCode];
      const prevConnects = i > 0 && isArabicLetter(chars[i - 1]) && !RIGHT_JOIN_ONLY.has(chars[i - 1]);
      const form = prevConnects ? ligature[1] : ligature[0];
      result.push(String.fromCharCode(form));
      if (diacritics.has(i)) {
        result.push(...diacritics.get(i)!.map(d => String.fromCharCode(d)));
      }
      if (diacritics.has(i + 1)) {
        result.push(...diacritics.get(i + 1)!.map(d => String.fromCharCode(d)));
      }
      i++;
      continue;
    }

    const forms = ARABIC_FORMS[code];
    if (!forms) {
      result.push(String.fromCharCode(code));
      if (diacritics.has(i)) {
        result.push(...diacritics.get(i)!.map(d => String.fromCharCode(d)));
      }
      continue;
    }

    const prevConnects = i > 0 && isArabicLetter(chars[i - 1]) && !RIGHT_JOIN_ONLY.has(chars[i - 1]);
    const nextExists = i + 1 < chars.length && isArabicLetter(chars[i + 1]);
    const canConnectNext = forms[2] !== 0;

    let formIndex: number;
    if (prevConnects && nextExists && canConnectNext) {
      formIndex = 3;
    } else if (prevConnects) {
      formIndex = 1;
    } else if (nextExists && canConnectNext) {
      formIndex = 2;
    } else {
      formIndex = 0;
    }

    const selectedForm = forms[formIndex] || forms[0];
    result.push(String.fromCharCode(selectedForm));
    if (diacritics.has(i)) {
      result.push(...diacritics.get(i)!.map(d => String.fromCharCode(d)));
    }
  }

  return result.join('');
}

/**
 * Strip hidden Bidi control characters that corrupt PDF visual ordering.
 * These chars are invisible but affect the Bidi algorithm causing partial reversals.
 */
export function sanitizeBidiText(text: string): string {
  if (!text) return text;
  // Remove all Unicode Bidi control characters
  return text
    .replace(/[\u200E\u200F\u061C\u200B\u200C\u200D\uFEFF\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\s{2,}/g, ' '); // collapse multiple spaces
}

// Direction types for Bidi algorithm
const DIR_RTL = 1;
const DIR_LTR = 2;
const DIR_NEUTRAL = 0;

function classifyChar(code: number): number {
  // Arabic script ranges (including presentation forms)
  if ((code >= 0x0600 && code <= 0x06FF) ||
      (code >= 0xFE70 && code <= 0xFEFF) ||
      (code >= 0xFB50 && code <= 0xFDFF)) {
    return DIR_RTL;
  }
  // Latin letters
  if ((code >= 0x0041 && code <= 0x005A) || // A-Z
      (code >= 0x0061 && code <= 0x007A)) { // a-z
    return DIR_LTR;
  }
  // All digit types are LTR
  if ((code >= 0x0030 && code <= 0x0039) || // 0-9
      (code >= 0x0660 && code <= 0x0669) || // Arabic-Indic ٠-٩
      (code >= 0x06F0 && code <= 0x06F9)) { // Extended Arabic-Indic
    return DIR_LTR;
  }
  return DIR_NEUTRAL;
}

/**
 * Convert reshaped Arabic text from logical order to visual order for jsPDF.
 * 
 * Implements a simplified Unicode Bidi algorithm (UAX #9):
 * 1. Sanitize hidden Bidi control characters
 * 2. Classify each character as RTL, LTR, or Neutral
 * 3. Build directional runs
 * 4. Resolve neutral runs: between two same-direction runs → inherit;
 *    between two different-direction runs → inherit from base (RTL)
 * 5. Special handling: neutrals directly adjacent to LTR on BOTH sides
 *    stay LTR (e.g., spaces/punctuation between two English words)
 * 6. Merge adjacent same-direction runs
 * 7. Reverse order of all runs (base direction RTL)
 * 8. Reverse characters inside RTL runs; keep LTR runs as-is
 */
export function toVisualOrder(text: string): string {
  if (!text) return text;
  
  // Sanitize first
  text = sanitizeBidiText(text);
  
  const hasRtl = /[\u0600-\u06FF\uFE70-\uFEFF\uFB50-\uFDFF]/.test(text);
  if (!hasRtl) return text;

  const chars = [...text];
  if (chars.length === 0) return text;
  
  const dirs = chars.map(ch => classifyChar(ch.codePointAt(0) || 0));

  // Build runs of consecutive same-direction characters
  interface Run { type: number; start: number; end: number; }
  const runs: Run[] = [];
  let runStart = 0;
  for (let i = 1; i <= dirs.length; i++) {
    if (i === dirs.length || dirs[i] !== dirs[runStart]) {
      runs.push({ type: dirs[runStart], start: runStart, end: i });
      runStart = i;
    }
  }

  // Resolve NEUTRAL runs based on context
  for (let i = 0; i < runs.length; i++) {
    if (runs[i].type !== DIR_NEUTRAL) continue;
    
    // Find nearest strong type before and after
    let prevType = DIR_RTL; // base direction
    for (let j = i - 1; j >= 0; j--) {
      if (runs[j].type !== DIR_NEUTRAL) { prevType = runs[j].type; break; }
    }
    let nextType = DIR_RTL; // base direction
    for (let j = i + 1; j < runs.length; j++) {
      if (runs[j].type !== DIR_NEUTRAL) { nextType = runs[j].type; break; }
    }
    
    // Both neighbors agree → inherit that direction
    // Neighbors disagree → use base direction (RTL)
    if (prevType === nextType) {
      runs[i].type = prevType;
    } else {
      // Special case: if neutral is between LTR runs with only neutrals in between,
      // check if the neutral content is "connective" (spaces, dots in emails, etc.)
      // For PDF RTL base, default to RTL
      runs[i].type = DIR_RTL;
    }
  }

  // Merge adjacent runs of the same resolved type
  const merged: Run[] = [runs[0]];
  for (let i = 1; i < runs.length; i++) {
    const last = merged[merged.length - 1];
    if (runs[i].type === last.type) {
      last.end = runs[i].end;
    } else {
      merged.push({ ...runs[i] });
    }
  }

  // Reverse the order of runs (RTL base direction)
  merged.reverse();

  // Build result: reverse characters inside RTL runs, keep LTR runs as-is
  const result: string[] = [];
  for (const run of merged) {
    const segment = chars.slice(run.start, run.end);
    if (run.type === DIR_RTL) {
      result.push(segment.reverse().join(''));
    } else {
      result.push(segment.join(''));
    }
  }

  return result.join('');
}

export function toArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d)]);
}

export function formatArabicNumber(num: number): string {
  return num.toLocaleString('ar-EG');
}

export function formatArabicDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}
