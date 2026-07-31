import { describe, expect, it, vi, beforeEach } from 'vitest'
import { titlePatternFromSample } from './classifier'

/**
 * Title-scope corrections must validate the pattern before any feedback write.
 * Mirrors the guard in correctActivityCategory (feedback.ts).
 */
function prepareTitleCorrection(titleSample: string | null): {
  ok: boolean
  pattern?: string
  message?: string
} {
  const pattern = titlePatternFromSample(titleSample ?? '')
  if (!pattern) {
    return { ok: false, message: 'Impossible de dériver un motif depuis le titre.' }
  }
  return { ok: true, pattern }
}

describe('title-scope correction guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid title before feedback would be written', () => {
    const appendFeedback = vi.fn()
    const result = prepareTitleCorrection('')
    expect(result.ok).toBe(false)
    if (result.ok) {
      appendFeedback()
    }
    expect(appendFeedback).not.toHaveBeenCalled()
  })

  it('accepts valid title and yields explicit pattern for matchedPattern', () => {
    const result = prepareTitleCorrection('github.com — Pull request')
    expect(result.ok).toBe(true)
    if (result.ok) {
<<<<<<< HEAD
      expect(result.pattern).toBe('github.com')
=======
      expect(result.pattern).toBe('github\\.com')
>>>>>>> 7d386cf717032111f3e978fa0871fa887d84b644
    }
  })
})
