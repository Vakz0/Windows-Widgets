/** Shared error → user-facing message helpers (no I/O). */

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }
  return fallback
}

/** Alias used by renderer activity UI. */
export const errMessage = errorMessage
