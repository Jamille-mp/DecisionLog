import { Clock, FileText, User as UserIcon } from 'lucide-react'
import { actionLabels } from '../../constants/app'
import type { AuditLog } from '../../types'

const fieldLabels: Record<string, string> = {
  active: 'situação',
  context: 'contexto',
  decision: 'decisão',
  department: 'departamento',
  departmentId: 'departamento',
  impact: 'impacto',
  reason: 'justificativa',
  status: 'status',
  title: 'título',
}

const valueLabels: Record<string, string> = {
  approved: 'concluída',
  archived: 'arquivada',
  false: 'inativo',
  high: 'alto',
  inactive: 'inativa',
  low: 'baixo',
  medium: 'médio',
  pending: 'pendente',
  true: 'ativo',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'não informado'
  if (typeof value === 'boolean') return valueLabels[String(value)] || String(value)
  if (typeof value === 'string') return valueLabels[value] || value
  return String(value)
}

function getState(details: Record<string, unknown>, key: 'estadoAnterior' | 'estadoNovo') {
  const state = details[key]
  return isRecord(state) ? state : undefined
}

function getDecisionTitle(details: Record<string, unknown>) {
  const title =
    readString(details.title) ||
    readString(getState(details, 'estadoNovo')?.title) ||
    readString(getState(details, 'estadoAnterior')?.title)

  if (title) return title

  return readString(details.decisionId) || 'decisão não identificada'
}

function getActor(event: AuditLog) {
  return event.userName || event.userEmail || event.userId || 'Usuário não identificado'
}

function describeUpdatedFields(details: Record<string, unknown>) {
  const fields = Array.isArray(details.updatedFields) ? details.updatedFields : []
  const previousState = getState(details, 'estadoAnterior')
  const nextState = getState(details, 'estadoNovo')

  const descriptions = fields
    .filter((field): field is string => typeof field === 'string')
    .slice(0, 4)
    .map((field) => {
      const label = fieldLabels[field] || field
      const previousValue = previousState ? formatValue(previousState[field]) : undefined
      const nextValue = nextState ? formatValue(nextState[field]) : undefined

      if (previousState && nextState) {
        return `${label}: ${previousValue} → ${nextValue}`
      }

      return label
    })

  if (descriptions.length === 0) {
    return 'alterou informações da decisão'
  }

  const suffix = fields.length > descriptions.length ? ` e mais ${fields.length - descriptions.length} campo(s)` : ''
  return `alterou ${descriptions.join(', ')}${suffix}`
}

function describeEvent(event: AuditLog) {
  const details = event.details || {}
  const title = getDecisionTitle(details)

  switch (event.action) {
    case 'DECISION_CREATED':
      return `criou a decisão "${title}".`
    case 'DECISION_UPDATED':
      return `${describeUpdatedFields(details)} em "${title}".`
    case 'DECISION_ARCHIVED':
      return `arquivou a decisão "${title}".`
    case 'DECISION_UNARCHIVED':
      return `desarquivou a decisão "${title}".`
    case 'DECISION_DELETED':
      return `inativou a decisão "${title}".`
    default:
      return `registrou um evento relacionado a "${title}".`
  }
}

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
                    <span>{getActor(event)}</span>
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
                  <strong>{getActor(event)}</strong> {describeEvent(event)}
                </p>
                {event.userEmail && event.userEmail !== event.userName && (
                  <small className="timeline-meta">Responsável: {event.userEmail}</small>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
