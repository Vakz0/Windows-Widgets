import { describe, expect, it } from 'vitest'
import { extractDatabaseId, extractPageId } from '../../shared/notionIds'

describe('extractDatabaseId / extractPageId', () => {
  it('formats a 32-char hex id as UUID', () => {
    const raw = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
    expect(extractDatabaseId(raw)).toBe('a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90')
    expect(extractPageId(raw)).toBe('a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90')
  })

  it('keeps an already-dashed UUID', () => {
    const id = 'a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90'
    expect(extractDatabaseId(id)).toBe(id)
  })

  it('extracts id from a Notion URL path', () => {
    const url =
      'https://www.notion.so/workspace/a1b2c3d4e5f60718293a4b5c6d7e8f90?v=xyz'
    expect(extractDatabaseId(url)).toBe('a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90')
  })
})
