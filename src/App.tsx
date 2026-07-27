import { resolveWidgetComponent } from './widgets/registry'

function getWidgetId(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('widget') ?? 'catalog'
}

export default function App() {
  const id = getWidgetId()
  const Component = resolveWidgetComponent(id)

  if (!Component) {
    return (
      <div className="widget-shell catalog-shell">
        <p className="catalog-empty">Widget inconnu : {id}</p>
      </div>
    )
  }

  return <Component />
}
