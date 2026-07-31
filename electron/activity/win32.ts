import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import koffi from 'koffi'

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

export type ForegroundInfo = {
  app: string
  title: string
  exeDir: string | null
  exePath: string | null
  pid: number
  hwndAddr: number | null
  isLatticeWindow: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NativeFn = (...args: any[]) => any

let GetForegroundWindow: NativeFn | null = null
let GetWindowTextW: NativeFn | null = null
let GetWindowThreadProcessId: NativeFn | null = null
let OpenProcess: NativeFn | null = null
let CloseHandle: NativeFn | null = null
let QueryFullProcessImageNameW: NativeFn | null = null
let win32Ready = false
let win32Failed = false

function parentDirName(fullPath: string): string | null {
  const parent = path.dirname(fullPath)
  const base = path.basename(parent)
  return base && base !== '.' && base !== '\\' && base !== '/' ? base : null
}

function initWin32(): boolean {
  if (win32Ready) return true
  if (win32Failed) return false
  try {
    const user32 = koffi.load('user32.dll')
    const kernel32 = koffi.load('kernel32.dll')
    GetForegroundWindow = user32.func('void * __stdcall GetForegroundWindow()')
    GetWindowTextW = user32.func(
      'int __stdcall GetWindowTextW(void *hWnd, void *lpString, int nMaxCount)',
    )
    GetWindowThreadProcessId = user32.func(
      'uint32 __stdcall GetWindowThreadProcessId(void *hWnd, _Out_ uint32 *lpdwProcessId)',
    )
    OpenProcess = kernel32.func(
      'void * __stdcall OpenProcess(uint32 dwDesiredAccess, int bInheritHandle, uint32 dwProcessId)',
    )
    CloseHandle = kernel32.func('int __stdcall CloseHandle(void *hObject)')
    QueryFullProcessImageNameW = kernel32.func(
      'int __stdcall QueryFullProcessImageNameW(void *hProcess, uint32 dwFlags, void *lpExeName, _Inout_ uint32 *lpdwSize)',
    )
    win32Ready = true
    return true
  } catch (err) {
    console.error('Activity tracker: Win32 init failed', err)
    win32Failed = true
    return false
  }
}

function readWideString(buf: Buffer, charCount: number): string {
  if (charCount <= 0) return ''
  return buf.toString('utf16le', 0, charCount * 2).replace(/\0+$/, '')
}

function hwndAddress(hwnd: unknown): number | null {
  if (hwnd == null) return null
  try {
    return Number(koffi.address(hwnd as never))
  } catch {
    return null
  }
}

function nativeHandleAddress(win: BrowserWindow): number | null {
  try {
    const buf = win.getNativeWindowHandle()
    if (buf.length >= 8) return Number(buf.readBigUInt64LE(0))
    if (buf.length >= 4) return buf.readUInt32LE(0)
  } catch {
    /* ignore */
  }
  return null
}

function isLatticeHwnd(hwndAddr: number | null): boolean {
  if (hwndAddr == null || hwndAddr === 0) return false
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    const h = nativeHandleAddress(win)
    if (h != null && h === hwndAddr) return true
  }
  return false
}

function isSelfExe(exePath: string | null, pid: number): boolean {
  if (pid > 0 && pid === process.pid) return true
  if (!exePath) return false
  try {
    const ours = path.normalize(app.getPath('exe')).toLowerCase()
    const theirs = path.normalize(exePath).toLowerCase()
    if (ours && theirs === ours) {
      // In production the packaged exe is unique. In dev both are electron.exe —
      // HWND check is the reliable signal; treat path match as soft hint only if not electron.
      const base = path.basename(theirs, path.extname(theirs))
      if (base !== 'electron') return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function getForeground(): ForegroundInfo | null {
  if (!initWin32()) return null
  try {
    const hwnd = GetForegroundWindow!()
    if (!hwnd) return null
    const hwndAddr = hwndAddress(hwnd)
    const latticeHwnd = isLatticeHwnd(hwndAddr)

    const titleBuf = Buffer.alloc(512 * 2)
    const titleLen = GetWindowTextW!(hwnd, titleBuf, 512) as number
    const title = readWideString(titleBuf, titleLen)

    const pidOut = [0]
    GetWindowThreadProcessId!(hwnd, pidOut)
    const pid = pidOut[0]
    if (!pid) {
      return {
        app: 'unknown',
        title,
        exeDir: null,
        exePath: null,
        pid: 0,
        hwndAddr,
        isLatticeWindow: latticeHwnd,
      }
    }

    const handle = OpenProcess!(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid)
    if (!handle) {
      return {
        app: `pid-${pid}`,
        title,
        exeDir: null,
        exePath: null,
        pid,
        hwndAddr,
        isLatticeWindow: latticeHwnd || isSelfExe(null, pid),
      }
    }

    try {
      const nameBuf = Buffer.alloc(520 * 2)
      const sizeOut = [520]
      const ok = QueryFullProcessImageNameW!(handle, 0, nameBuf, sizeOut) as number
      if (!ok) {
        return {
          app: `pid-${pid}`,
          title,
          exeDir: null,
          exePath: null,
          pid,
          hwndAddr,
          isLatticeWindow: latticeHwnd || isSelfExe(null, pid),
        }
      }
      const fullPath = readWideString(nameBuf, sizeOut[0])
      const base = path.basename(fullPath, path.extname(fullPath)).toLowerCase()
      return {
        app: base || `pid-${pid}`,
        title,
        exeDir: parentDirName(fullPath),
        exePath: fullPath,
        pid,
        hwndAddr,
        isLatticeWindow: latticeHwnd || isSelfExe(fullPath, pid),
      }
    } finally {
      CloseHandle!(handle)
    }
  } catch (err) {
    console.error('Activity tracker: foreground read failed', err)
    return null
  }
}
