import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { WidgetDefinition } from '../../shared/widget'

/**
 * Emplacement prévu pour les plugins runtime :
 * `%APPDATA%/lattice-desk/widgets/<id>/manifest.json`
 *
 * Cette itération ne charge aucun bundle externe — le scan existe
 * pour figer le contrat et pouvoir brancher le chargement plus tard.
 */
export function externalWidgetsRoot(): string {
  return path.join(app.getPath('userData'), 'widgets')
}

/**
 * Découvre les manifests externes. Retourne toujours `[]` tant que
 * le chargeur de plugins n’est pas implémenté (même si des dossiers existent).
 */
export function discoverExternalWidgets(): WidgetDefinition[] {
  const root = externalWidgetsRoot()
  try {
    if (!fs.existsSync(root)) return []
    // Reserved: iterate subdirs, parse manifest.json, validate, return definitions.
    // Intentionally empty until runtime plugins ship.
    void root
  } catch {
    /* ignore */
  }
  return []
}
