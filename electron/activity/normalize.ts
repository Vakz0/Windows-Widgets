/** Normalize process / app names for rules and allowlists. */
export function normalizeAppKey(app: string): string {
  return app.trim().toLowerCase().replace(/\.exe$/i, '')
}
