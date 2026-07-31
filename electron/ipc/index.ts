import { registerActivityIpc } from './activityIpc'
import { registerConfigIpc } from './configIpc'
import { registerFocusIpc } from './focusIpc'
import { registerNotionIpc } from './notionIpc'
import { registerStatsIpc } from './statsIpc'
import { registerUpdatesIpc } from './updatesIpc'
import { registerWidgetsIpc } from './widgetsIpc'
import type { IpcDeps } from './types'

export type { IpcDeps } from './types'

export function registerAllIpc(deps: IpcDeps): void {
  registerNotionIpc(deps)
  registerConfigIpc(deps)
  registerWidgetsIpc(deps)
  registerStatsIpc(deps)
  registerActivityIpc(deps)
  registerFocusIpc(deps)
  registerUpdatesIpc()
}
