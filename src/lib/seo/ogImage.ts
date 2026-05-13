/**
 * Build a URL to the dynamic Open Graph image generator edge function.
 * Returns an absolute URL pointing to a 1200x630 SVG share image rendered
 * from the given parameters — used for invoice/quote/customer detail pages
 * that need a unique social preview.
 *
 * The edge function caches aggressively, so calling this with the same
 * inputs is effectively free after the first render.
 *
 * If `title` is missing or the env var is not configured, we return a static
 * brand-safe fallback image instead of a broken URL.
 */
export interface OgImageParams {
  title?: string;
  subtitle?: string;
  meta?: string;
  variant?: 'invoice' | 'quote' | 'customer' | 'supplier' | 'default';
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SITE_ORIGIN = 'https://erpsmartarabic1.lovable.app';
const OG_IMAGE_VERSION =
  (import.meta.env.VITE_OG_IMAGE_VERSION as string | undefined)?.trim() || '2';

/** Static brand fallback used when dynamic generation isn't possible. */
export const OG_FALLBACK_IMAGE = `${SITE_ORIGIN}/og-image.jpg?v=${OG_IMAGE_VERSION}`;

/** Per-variant static fallback so even on failure the preview stays on-brand. */
const VARIANT_FALLBACK: Record<NonNullable<OgImageParams['variant']>, string> = {
  invoice: `${SITE_ORIGIN}/og-invoices.jpg?v=${OG_IMAGE_VERSION}`,
  quote: `${SITE_ORIGIN}/og-invoices.jpg?v=${OG_IMAGE_VERSION}`,
  customer: `${SITE_ORIGIN}/og-customers.jpg?v=${OG_IMAGE_VERSION}`,
  supplier: `${SITE_ORIGIN}/og-suppliers.jpg?v=${OG_IMAGE_VERSION}`,
  default: OG_FALLBACK_IMAGE,
};

function variantFallback(variant?: OgImageParams['variant']): string {
  return variant ? VARIANT_FALLBACK[variant] : OG_FALLBACK_IMAGE;
}

export function buildOgImageUrl(params: OgImageParams): string {
  const title = params.title?.trim();

  // Missing data or unreachable edge — fall back to static brand image so
  // social previews never end up broken.
  if (!title || !SUPABASE_URL) return variantFallback(params.variant);

  try {
    const url = new URL(`${SUPABASE_URL}/functions/v1/og-image`);
    url.searchParams.set('title', title);
    if (params.subtitle) url.searchParams.set('subtitle', params.subtitle);
    if (params.meta) url.searchParams.set('meta', params.meta);
    if (params.variant) url.searchParams.set('variant', params.variant);
    // Tie the dynamic URL to OG_IMAGE_VERSION too, so a version bump
    // invalidates social-scraper caches even for SVG previews.
    url.searchParams.set('v', OG_IMAGE_VERSION);
    return url.toString();
  } catch {
    return variantFallback(params.variant);
  }
}
