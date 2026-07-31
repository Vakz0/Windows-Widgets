import type { PublicConfig, TaskPropertyMapping, TaskSourceFilters } from '../../../shared/types'
import { ButtonSpinner } from '../Spinner'

function notionStatusLabel(config: PublicConfig): string {
  if (config.demoMode) return 'Mode démo'
  if (config.notionConfigured) return 'Connecté'
  if (config.notionTokenStored) return 'Token enregistré — base manquante'
  return 'Non configuré'
}

export function CatalogNotionSettings({
  config,
  busy,
  tokenDraft,
  databaseId,
  properties,
  filters,
  completedDraft,
  dbTitle,
  notionAction,
  testMessage,
  testOk,
  onTokenDraftChange,
  onDatabaseIdChange,
  onPropChange,
  onFiltersChange,
  onCompletedDraftChange,
  onTestConnection,
  onSaveNotion,
}: {
  config: PublicConfig
  busy: boolean
  tokenDraft: string
  databaseId: string
  properties: TaskPropertyMapping
  filters: TaskSourceFilters
  completedDraft: string
  dbTitle: string | null
  notionAction: 'test' | 'save' | null
  testMessage: string | null
  testOk: boolean
  onTokenDraftChange: (value: string) => void
  onDatabaseIdChange: (value: string) => void
  onPropChange: <K extends keyof TaskPropertyMapping>(key: K, value: string) => void
  onFiltersChange: (updater: (prev: TaskSourceFilters) => TaskSourceFilters) => void
  onCompletedDraftChange: (value: string) => void
  onTestConnection: () => void
  onSaveNotion: () => void
}) {
  return (
    <section className="catalog-settings-card">
      <h2 className="catalog-settings-title">Notion</h2>
      <p className="catalog-settings-hint">
        Créez une{' '}
        <button
          type="button"
          className="catalog-link-btn"
          onClick={() => void window.lattice.openExternal('https://www.notion.so/my-integrations')}
        >
          intégration interne
        </button>
        , partagez-la avec votre base, puis collez le secret et l’URL ici. Le token n’est jamais
        renvoyé à l’interface après enregistrement.
      </p>

      <div className="catalog-notion-status" data-state={config.notionConfigured ? 'ok' : 'warn'}>
        <span>{notionStatusLabel(config)}</span>
        {config.notionTokenStored && (
          <span className="catalog-notion-token-hint">Token enregistré · ••••••••</span>
        )}
        {dbTitle && <span className="catalog-notion-token-hint">Base : {dbTitle}</span>}
        {config.projectSourcesCount > 0 && (
          <span className="catalog-notion-token-hint">
            {config.projectSourcesCount} source
            {config.projectSourcesCount > 1 ? 's' : ''} secondaire
            {config.projectSourcesCount > 1 ? 's' : ''} (config.json)
          </span>
        )}
      </div>

      <label className="catalog-field">
        <span className="catalog-field-label">
          Token d’intégration
          {config.notionTokenStored ? ' (laisser vide pour conserver)' : ''}
        </span>
        <input
          type="password"
          className="catalog-input catalog-input-wide"
          autoComplete="off"
          placeholder={config.notionTokenStored ? '••••••••••••••••' : 'secret_… ou ntn_…'}
          value={tokenDraft}
          disabled={busy}
          onChange={(e) => onTokenDraftChange(e.target.value)}
        />
      </label>

      <label className="catalog-field">
        <span className="catalog-field-label">URL ou ID de la base</span>
        <input
          type="text"
          className="catalog-input catalog-input-wide"
          placeholder="https://www.notion.so/…"
          value={databaseId}
          disabled={busy}
          onChange={(e) => onDatabaseIdChange(e.target.value)}
        />
      </label>

      <div className="catalog-prop-grid">
        {(
          [
            ['title', 'Titre'],
            ['date', 'Date'],
            ['tag', 'Pastille / tag'],
            ['status', 'Importance / priorité'],
            ['urgency', 'Urgence (optionnel)'],
            ['workflowStatus', 'Statut workflow (optionnel)'],
            ['doneCheckbox', 'Case terminé (optionnel)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="catalog-field">
            <span className="catalog-field-label">{label}</span>
            <input
              type="text"
              className="catalog-input catalog-input-wide"
              value={properties[key] ?? ''}
              disabled={busy}
              onChange={(e) => onPropChange(key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <label className="catalog-toggle-row">
        <div className="catalog-toggle-copy">
          <span className="catalog-field-label">Masquer les tâches terminées</span>
          <span className="catalog-field-help">`filters.hideCompleted`</span>
        </div>
        <span className="catalog-switch catalog-switch-inline">
          <input
            type="checkbox"
            checked={filters.hideCompleted}
            disabled={busy}
            onChange={(e) =>
              onFiltersChange((prev) => ({ ...prev, hideCompleted: e.target.checked }))
            }
          />
          <span className="catalog-switch-track" aria-hidden>
            <span className="catalog-switch-thumb" />
          </span>
        </span>
      </label>

      <label className="catalog-field">
        <span className="catalog-field-label">Statuts considérés comme terminés</span>
        <span className="catalog-field-help">Séparés par des virgules (ex. Done, Terminé)</span>
        <input
          type="text"
          className="catalog-input catalog-input-wide"
          value={completedDraft}
          disabled={busy}
          onChange={(e) => onCompletedDraftChange(e.target.value)}
        />
      </label>

      <p className="catalog-settings-hint">
        Sources secondaires (`projectSources`) : éditer dans le fichier config.
      </p>

      <div className="catalog-settings-actions">
        <button
          type="button"
          className="catalog-detail-cta catalog-detail-cta-secondary"
          disabled={busy}
          onClick={() => void onTestConnection()}
        >
          {notionAction === 'test' ? <ButtonSpinner label="Test en cours…" /> : 'Tester la connexion'}
        </button>
        <button
          type="button"
          className="catalog-detail-cta"
          disabled={busy}
          onClick={() => void onSaveNotion()}
        >
          {notionAction === 'save' ? <ButtonSpinner label="Enregistrement…" /> : 'Enregistrer Notion'}
        </button>
      </div>
      {testMessage && (
        <p className="catalog-notion-test-msg" data-ok={testOk}>
          {testMessage}
        </p>
      )}
    </section>
  )
}
