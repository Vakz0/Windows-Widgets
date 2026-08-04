/** Pure Notion ID parsers (no I/O, no config). */

function extractNotionId(input: string): string {
  const trimmed = input.trim()
  const fromPath = trimmed.match(/([0-9a-fA-F]{32})/)
  if (fromPath) {
    const raw = fromPath[1]
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
  }
  const uuid = trimmed.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  )
  return uuid ? uuid[0] : trimmed
}

export function extractDatabaseId(input: string): string {
  return extractNotionId(input)
}

export function extractPageId(input: string): string {
  return extractNotionId(input)
}
