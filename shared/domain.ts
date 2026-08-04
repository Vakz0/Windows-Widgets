/**
 * Hostname helpers only (browser domains for activity classification).
 * Not related to electron/ “domain folders” (activity/, focus/, notion/).
 */
/** Normalize a hostname for matching (lowercase, no trailing dot, no www.). */
export function normalizeDomain(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.$/, '')
  return h.startsWith('www.') ? h.slice(4) : h
}
