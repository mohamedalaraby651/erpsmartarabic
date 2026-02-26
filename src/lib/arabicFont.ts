// Arabic font support for PDF generation
// Using Amiri font (Open Source Arabic font)

export const ARABIC_FONT_NAME = 'Amiri';

// Function to add Arabic font to jsPDF
export async function loadArabicFont(): Promise<string | null> {
  try {
    const response = await fetch('https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf');
    if (!response.ok) {
      console.error('Failed to load Arabic font');
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    return base64;
  } catch (error) {
    console.error('Error loading Arabic font:', error);
    return null;
  }
}

// ===== Arabic Text Reshaping =====
// Arabic letters have 4 contextual forms: Isolated, Initial, Medial, Final
// This map uses Unicode Presentation Forms-B (U+FE70-U+FEFF)

// [isolated, final, initial, medial] - 0 means the form doesn't exist (use isolated)
const ARABIC_FORMS: Record<number, [number, number, number, number]> = {
  // Hamza
  0x0621: [0xFE80, 0, 0, 0], // ء - only isolated
  // Alef with Madda
  0x0622: [0xFE81, 0xFE82, 0, 0], // آ
  // Alef with Hamza Above
  0x0623: [0xFE83, 0xFE84, 0, 0], // أ
  // Waw with Hamza
  0x0624: [0xFE85, 0xFE86, 0, 0], // ؤ
  // Alef with Hamza Below
  0x0625: [0xFE87, 0xFE88, 0, 0], // إ
  // Yeh with Hamza
  0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], // ئ
  // Alef
  0x0627: [0xFE8D, 0xFE8E, 0, 0], // ا
  // Beh
  0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92], // ب
  // Teh Marbuta
  0x0629: [0xFE93, 0xFE94, 0, 0], // ة
  // Teh
  0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98], // ت
  // Theh
  0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], // ث
  // Jeem
  0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], // ج
  // Hah
  0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], // ح
  // Khah
  0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], // خ
  // Dal
  0x062F: [0xFEA9, 0xFEAA, 0, 0], // د
  // Thal
  0x0630: [0xFEAB, 0xFEAC, 0, 0], // ذ
  // Reh
  0x0631: [0xFEAD, 0xFEAE, 0, 0], // ر
  // Zain
  0x0632: [0xFEAF, 0xFEB0, 0, 0], // ز
  // Seen
  0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], // س
  // Sheen
  0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], // ش
  // Sad
  0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], // ص
  // Dad
  0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], // ض
  // Tah
  0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], // ط
  // Zah
  0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], // ظ
  // Ain
  0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC], // ع
  // Ghain
  0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0], // غ
  // Feh
  0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4], // ف
  // Qaf
  0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8], // ق
  // Kaf
  0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // ك
  // Lam
  0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], // ل
  // Meem
  0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], // م
  // Noon
  0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], // ن
  // Heh
  0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], // ه
  // Waw
  0x0648: [0xFEED, 0xFEEE, 0, 0], // و
  // Alef Maksura
  0x0649: [0xFEEF, 0xFEF0, 0, 0], // ى
  // Yeh
  0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // ي
  // Tatweel (kashida)
  0x0640: [0x0640, 0x0640, 0x0640, 0x0640], // ـ
};

// Lam-Alef ligatures
const LAM_ALEF_LIGATURES: Record<number, [number, number]> = {
  // [isolated, final]
  0x0622: [0xFEF5, 0xFEF6], // لآ
  0x0623: [0xFEF7, 0xFEF8], // لأ
  0x0625: [0xFEF9, 0xFEFA], // لإ
  0x0627: [0xFEFB, 0xFEFC], // لا
};

// Letters that DON'T connect to the next letter (right-joiners only)
const RIGHT_JOIN_ONLY = new Set([
  0x0621, // ء Hamza
  0x0622, // آ
  0x0623, // أ
  0x0624, // ؤ
  0x0625, // إ
  0x0627, // ا
  0x062F, // د
  0x0630, // ذ
  0x0631, // ر
  0x0632, // ز
  0x0648, // و
  0x0649, // ى
  0x0629, // ة Teh Marbuta
]);

function isArabicLetter(code: number): boolean {
  return code >= 0x0621 && code <= 0x064A && ARABIC_FORMS[code] !== undefined;
}

function isArabicDiacritic(code: number): boolean {
  return code >= 0x064B && code <= 0x0652;
}

function isArabicChar(code: number): boolean {
  return (code >= 0x0600 && code <= 0x06FF) || (code >= 0xFE70 && code <= 0xFEFF);
}

/**
 * Reshape Arabic text by replacing each letter with its correct contextual form.
 * Also handles Lam-Alef ligatures.
 * For jsPDF: after reshaping, the text needs to be reversed for correct RTL rendering.
 */
export function reshapeArabicText(text: string): string {
  if (!text) return text;
  
  // Check if text contains Arabic characters
  if (!/[\u0600-\u06FF]/.test(text)) return text;

  // Process the text: split into segments (Arabic vs non-Arabic)
  const segments: { text: string; isArabic: boolean }[] = [];
  let currentSegment = '';
  let currentIsArabic = false;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const charIsArabic = isArabicChar(code) || isArabicDiacritic(code);
    
    if (i === 0) {
      currentIsArabic = charIsArabic;
      currentSegment = text[i];
    } else if (charIsArabic === currentIsArabic) {
      currentSegment += text[i];
    } else {
      segments.push({ text: currentSegment, isArabic: currentIsArabic });
      currentSegment = text[i];
      currentIsArabic = charIsArabic;
    }
  }
  if (currentSegment) {
    segments.push({ text: currentSegment, isArabic: currentIsArabic });
  }

  // Process each Arabic segment
  const result = segments.map(seg => {
    if (!seg.isArabic) return seg.text;
    return reshapeArabicSegment(seg.text);
  });

  // For RTL: reverse the entire output so jsPDF renders it correctly
  return result.join('').split('').reverse().join('');
}

function reshapeArabicSegment(text: string): string {
  // Strip diacritics for joining analysis but keep them for output
  const chars: number[] = [];
  const diacritics: Map<number, number[]> = new Map();
  
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (isArabicDiacritic(code)) {
      // Attach to previous letter
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
      // Add any diacritics
      if (diacritics.has(i)) {
        result.push(...diacritics.get(i)!.map(d => String.fromCharCode(d)));
      }
      continue;
    }

    // Check for Lam-Alef ligature
    if (code === 0x0644 && i + 1 < chars.length && LAM_ALEF_LIGATURES[chars[i + 1]]) {
      const alefCode = chars[i + 1];
      const ligature = LAM_ALEF_LIGATURES[alefCode];
      
      // Determine if previous char connects to this Lam
      const prevConnects = i > 0 && isArabicLetter(chars[i - 1]) && !RIGHT_JOIN_ONLY.has(chars[i - 1]);
      
      // Use final form if previous connects, otherwise isolated
      const form = prevConnects ? ligature[1] : ligature[0];
      result.push(String.fromCharCode(form));
      
      // Add diacritics for both lam and alef positions
      if (diacritics.has(i)) {
        result.push(...diacritics.get(i)!.map(d => String.fromCharCode(d)));
      }
      if (diacritics.has(i + 1)) {
        result.push(...diacritics.get(i + 1)!.map(d => String.fromCharCode(d)));
      }
      
      i++; // Skip the Alef
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

    // Determine context
    const prevConnects = i > 0 && isArabicLetter(chars[i - 1]) && !RIGHT_JOIN_ONLY.has(chars[i - 1]);
    const nextExists = i + 1 < chars.length && isArabicLetter(chars[i + 1]);
    const canConnectNext = forms[2] !== 0; // Has initial form = can connect forward

    let formIndex: number;
    if (prevConnects && nextExists && canConnectNext) {
      formIndex = 3; // medial
    } else if (prevConnects) {
      formIndex = 1; // final
    } else if (nextExists && canConnectNext) {
      formIndex = 2; // initial
    } else {
      formIndex = 0; // isolated
    }

    const selectedForm = forms[formIndex] || forms[0];
    result.push(String.fromCharCode(selectedForm));
    
    // Add diacritics
    if (diacritics.has(i)) {
      result.push(...diacritics.get(i)!.map(d => String.fromCharCode(d)));
    }
  }

  return result.join('');
}

// Convert Arabic numerals to Eastern Arabic numerals (optional)
export function toArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => arabicNumerals[parseInt(d)]);
}

// Format number with Arabic locale
export function formatArabicNumber(num: number): string {
  return num.toLocaleString('ar-EG');
}

// Format date in Arabic
export function formatArabicDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Load image from URL and convert to base64 for PDF embedding
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
