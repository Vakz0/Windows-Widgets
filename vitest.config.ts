import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts', 'shared/**/*.test.ts'],
    setupFiles: ['electron/activity/test/setup.ts'],
  },
  resolve: {
    alias: {
      electron: path.resolve(__dirname, 'electron/activity/test/electron-mock.ts'),
    },
  },
})
