/**
 * Activity tracker — public façade.
 * Implementation lives under ./activity/
 */
export { loadActivityState } from './activity/storage'
export {
  setActivityUpdatedListener,
  startActivityTracker,
  stopActivityTracker,
  isActivityTrackerRunning,
  getActivitySummary,
  getActivityFocusSeed,
  refreshActivitySummary,
  getActivitySettings,
  updateActivitySettings,
  getActivityRules,
  openActivityRulesFile,
  reloadActivityRules,
  handleActivitySuspend,
  handleActivityResume,
  clearActivityData,
  CATEGORIES,
} from './activity/tracker'
export { correctActivityCategory } from './activity/feedback'
export { exportActivity } from './activity/export'
