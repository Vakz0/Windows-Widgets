import { Client } from '@notionhq/client'
import type {
  NotionConnectionTestResult,
  NotionDatabasePropertyInfo,
} from '../../shared/types'
import { extractDatabaseId } from '../config'
import { errorMessage } from './client'
import { databaseTitle, suggestPropertyMapping } from './properties'

/**
 * Test Notion credentials against a database (retrieve schema).
 * Token is only used in the main process — never returned.
 */
export async function testNotionConnection(opts: {
  token: string
  databaseId: string
}): Promise<NotionConnectionTestResult> {
  const token = opts.token.trim()
  const databaseId = opts.databaseId.trim()
  if (!token) {
    return { ok: false, message: 'Token d’intégration manquant.' }
  }
  if (!databaseId) {
    return { ok: false, message: 'URL ou ID de base manquant.' }
  }

  try {
    const client = new Client({ auth: token })
    const dbId = extractDatabaseId(databaseId)
    const db = await client.databases.retrieve({ database_id: dbId })
    const rawProps =
      'properties' in db && db.properties && typeof db.properties === 'object'
        ? (db.properties as Record<string, { type?: string }>)
        : {}

    const properties: NotionDatabasePropertyInfo[] = Object.entries(rawProps).map(
      ([name, prop]) => ({
        name,
        type: String(prop?.type ?? 'unknown'),
      }),
    )

    return {
      ok: true,
      message: 'Connexion réussie.',
      databaseTitle: databaseTitle(db as { title?: Array<{ plain_text?: string }> }),
      properties,
      suggestedProperties: suggestPropertyMapping(properties),
    }
  } catch (err) {
    const message = errorMessage(err, 'Échec de la connexion Notion.')
    console.error('Notion connection test failed', err)
    return { ok: false, message }
  }
}
