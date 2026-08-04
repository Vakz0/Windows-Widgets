import { BrowserWindow, screen } from 'electron'
import type { FocusInterruptContext } from '../../shared/types'
import { refreshActivitySummary } from '../activity'
import { getFocusSession, setFocusSessionListeners } from './session'
import { broadcastToAllWindows } from '../notify'
import {
  appIconPath,
  applyWindowIcon,
  defaultWebPreferences,
  loadRendererWidget,
} from '../windows/helpers'

export function createFocusInterruptController() {
  let focusInterruptWindow: BrowserWindow | null = null

  function broadcastFocusSession(): void {
    broadcastToAllWindows('focus-session-updated', getFocusSession())
    refreshActivitySummary()
  }

  function hideFocusInterruptWindow(): void {
    if (focusInterruptWindow && !focusInterruptWindow.isDestroyed()) {
      focusInterruptWindow.hide()
    }
  }

  function showFocusInterruptWindow(ctx: FocusInterruptContext): void {
    const display = screen.getPrimaryDisplay().workArea
    const width = 420
    const height = 420
    const x = display.x + Math.floor((display.width - width) / 2)
    const y = display.y + Math.floor((display.height - height) / 2)

    if (!focusInterruptWindow || focusInterruptWindow.isDestroyed()) {
      focusInterruptWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        show: false,
        frame: false,
        transparent: false,
        resizable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        hasShadow: true,
        backgroundColor: '#191919',
        icon: appIconPath(),
        webPreferences: defaultWebPreferences({ backgroundThrottling: false }),
      })
      applyWindowIcon(focusInterruptWindow)
      focusInterruptWindow.setAlwaysOnTop(true, 'pop-up-menu')
      focusInterruptWindow.setVisibleOnAllWorkspaces(true)
      loadRendererWidget(focusInterruptWindow, 'focus-interrupt')

      focusInterruptWindow.on('closed', () => {
        focusInterruptWindow = null
      })
    } else {
      focusInterruptWindow.setBounds({ x, y, width, height })
    }

    const win = focusInterruptWindow
    const sendCtx = () => {
      if (!win.isDestroyed()) win.webContents.send('focus-interrupt', ctx)
    }
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', () => {
        sendCtx()
        win.show()
        win.focus()
      })
    } else {
      sendCtx()
      win.show()
      win.focus()
    }
  }

  function wireFocusSessionBridge(): void {
    setFocusSessionListeners({
      onChanged: () => broadcastFocusSession(),
      onInterrupt: (ctx) => showFocusInterruptWindow(ctx),
    })
  }

  return {
    showFocusInterruptWindow,
    hideFocusInterruptWindow,
    wireFocusSessionBridge,
  }
}
