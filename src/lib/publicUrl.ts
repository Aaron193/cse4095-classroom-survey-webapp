// Builds the public student survey link from the configured site URL.
export function getPublicSurveyUrl(slug: string): string {
  const base =
    import.meta.env.VITE_PUBLIC_SITE_URL?.trim() || window.location.origin;
  return `${base.replace(/\/+$/, "")}/s/${encodeURIComponent(slug)}`;
}
