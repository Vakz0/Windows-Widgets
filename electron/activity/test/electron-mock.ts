export const app = {
  getPath: (name: string) => `/tmp/lattice-test/${name}`,
  getAppPath: () => '/tmp/lattice-test/app',
  getName: () => 'lattice-desk',
}

export const BrowserWindow = {
  getAllWindows: () => [],
}

export const powerMonitor = {
  getSystemIdleTime: () => 0,
}

export const dialog = {
  showSaveDialog: async () => ({ canceled: true }),
}

export const shell = {
  openPath: async () => '',
}
