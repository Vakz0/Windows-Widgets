/** Normalize a hostname for matching (lowercase, no trailing dot, no www.). */
export function normalizeDomain(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.$/, '')
  return h.startsWith('www.') ? h.slice(4) : h
}
