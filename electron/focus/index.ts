/** Focus domain — public façade (session API + pure guard helpers). */
export {
  ensureFocusSessionLoaded,
  setFocusSessionListeners,
  getFocusSession,
  hasFocusSession,
  getPendingFocusInterrupt,
  getFocusAttribution,
  startFocusSession,
  stopFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  updateFocusAllowlist,
  evaluateFocusGuard,
  resolveFocusInterrupt,
  getFocusJournal,
  readFocusJournalInRange,
  clearFocusJournalFile,
} from './session'

export { shouldBeginInterrupt, applyInterruptAction } from './guard'
