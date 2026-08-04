/** Stats système (CPU / RAM / température). */

export interface SystemStats {
  cpuPercent: number
  ramPercent: number
  ramUsedGb: number
  ramTotalGb: number
  temperatureC: number | null
  tempSource?: string | null
  updatedAt: string
}
