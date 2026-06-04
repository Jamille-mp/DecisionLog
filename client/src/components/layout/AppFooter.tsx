import type { Health } from '../../types'

export function AppFooter({ health }: { health: Health | null }) {
  return (
    <footer className="app-footer">
      <div>
        <strong>DecisionLog</strong>
        <span>Ambiente local de desenvolvimento</span>
      </div>
      <div>
        <span>API {health?.status === 'ok' ? 'operacional' : 'verificando'}</span>
        <span>v0.1 MVP acadêmico</span>
      </div>
    </footer>
  )
}
