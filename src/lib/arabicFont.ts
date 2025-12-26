// Arabic font support for PDF generation
// Using Amiri font (Open Source Arabic font)
// This is a subset of the font for basic Arabic text support

export const ARABIC_FONT_NAME = 'Amiri';

// Function to add Arabic font to jsPDF
export async function loadArabicFont(): Promise<string | null> {
  try {
    // Load Amiri font from Google Fonts CDN
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

// Reverse Arabic text for correct RTL rendering in PDF
export function reverseArabicText(text: string): string {
  if (!text) return text;
  
  // Split by spaces to handle words separately
  const words = text.split(' ');
  
  // Check if text contains Arabic characters
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  
  if (hasArabic) {
    // Reverse word order for RTL languages
    return words.reverse().join(' ');
  }
  
  return text;
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
