import { Clock, FileText, User as UserIcon } from 'lucide-react'
import { actionLabels } from '../../constants/app'
import type { AuditLog } from '../../types'

export function AuditList({
  emptyMessage = 'Nenhum evento de auditoria registrado',
  events,
}: {
  emptyMessage?: string
  events: AuditLog[]
}) {
  return (
    <div className="audit-card">
      <div className="timeline">
        {events.length === 0 ? (
          <p className="empty-message">{emptyMessage}</p>
        ) : (
          events.map((event, index) => (
            <div key={event.id} className="timeline-item">
              {index !== events.length - 1 && <div className="timeline-line" />}
              <div className="timeline-dot">
                <Clock />
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <div>
                    <UserIcon />
                    <span>{event.userId || 'Usuário autenticado'}</span>
                  </div>
                  <time>
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(event.timestamp))}
                  </time>
                </div>
                <div className="timeline-action">
                  <FileText />
                  <span>{actionLabels[event.action] || event.action}</span>
                </div>
                <p>
                  Decisão:{' '}
                  {typeof event.details?.title === 'string'
                    ? event.details.title
                    : typeof event.details?.decisionId === 'string'
                      ? event.details.decisionId
                      : 'Evento do sistema'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
