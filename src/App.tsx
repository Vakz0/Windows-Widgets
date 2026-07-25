import { CalendarWidget } from './widgets/CalendarWidget'
import { TasksWidget } from './widgets/TasksWidget'
import { MonitorWidget } from './widgets/MonitorWidget'

function getWidget(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('widget') ?? 'calendar'
}

export default function App() {
  const widget = getWidget()

  if (widget === 'tasks') return <TasksWidget />
  if (widget === 'monitor') return <MonitorWidget />
  return <CalendarWidget />
}
