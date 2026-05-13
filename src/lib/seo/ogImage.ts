/**
 * Build a URL to the dynamic Open Graph image generator edge function.
 * Returns an absolute URL pointing to a 1200x630 SVG share image rendered
 * from the given parameters — used for invoice/quote/customer detail pages
 * that need a unique social preview.
 *
 * The edge function caches aggressively, so calling this with the same
 * inputs is effectively free after the first render.
 */
export interface OgImageParams {
  title: string;
  subtitle?: string;
  meta?: string;
  variant?: 'invoice' | 'quote' | 'customer' | 'supplier' | 'default';
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function buildOgImageUrl(params: OgImageParams): string {
  const url = new URL(`${SUPABASE_URL}/functions/v1/og-image`);
  url.searchParams.set('title', params.title);
  if (params.subtitle) url.searchParams.set('subtitle', params.subtitle);
  if (params.meta) url.searchParams.set('meta', params.meta);
  if (params.variant) url.searchParams.set('variant', params.variant);
  return url.toString();
}
