/** Build PublicConfig from the live AppConfig (never exposes the raw token). */
import {
  getConfigPath,
  getUpdatesConfig,
  hasValidNotionCredentials,
} from '../config'
import type { AppConfig, PublicConfig } from '../../shared/types'

export function toPublicConfig(config: AppConfig): PublicConfig {
  return {
    refreshIntervalSeconds: config.refreshIntervalSeconds,
    demoMode: config.demoMode,
    configPath: getConfigPath(),
    launchAtStartup: config.launchAtStartup,
    notionConfigured: hasValidNotionCredentials(config),
    notionTokenStored: Boolean(config.notionToken?.trim()),
    databaseId: config.databaseId ?? '',
    properties: { ...config.properties },
    filters: {
      hideCompleted: config.filters.hideCompleted,
      completedStatusValues: [...(config.filters.completedStatusValues ?? [])],
    },
    projectSourcesCount: config.projectSources?.length ?? 0,
    updates: getUpdatesConfig(config),
  }
}
