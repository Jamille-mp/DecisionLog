import { ArrowRight, Clock, FileText, User as UserIcon } from 'lucide-react'
import { actionLabels } from '../../constants/app'
import type { AuditLog } from '../../types'

const fieldLabels: Record<string, string> = {
  active: 'Situação',
  context: 'Contexto',
  decision: 'Decisão',
  department: 'Departamento',
  departmentId: 'Departamento',
  impact: 'Impacto',
  reason: 'Justificativa',
  status: 'Status',
  title: 'Título',
}

const valueLabels: Record<string, string> = {
  approved: 'Concluída',
  archived: 'Arquivada',
  false: 'Inativo',
  high: 'Alto',
  inactive: 'Inativa',
  low: 'Baixo',
  medium: 'Médio',
  pending: 'Pendente',
  true: 'Ativo',
}

type ChangeItem = {
  field: string
  from?: string
  to?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  if (typeof value === 'boolean') return valueLabels[String(value)] || String(value)
  if (typeof value === 'string') return valueLabels[value] || value
  return String(value)
}

function getState(details: Record<string, unknown>, key: 'estadoAnterior' | 'estadoNovo') {
  const state = details[key]
  return isRecord(state) ? state : undefined
}

function getDecisionTitle(details: Record<string, unknown>) {
  return (
    readString(details.title) ||
    readString(getState(details, 'estadoNovo')?.title) ||
    readString(getState(details, 'estadoAnterior')?.title) ||
    readString(details.decisionId) ||
    'Decisão não identificada'
  )
}

function getActor(event: AuditLog) {
  return event.userName || event.userEmail || event.userId || 'Usuário não identificado'
}

function getChangedFields(details: Record<string, unknown>) {
  const fields = Array.isArray(details.updatedFields) ? details.updatedFields : []

  return fields.filter((field): field is string => typeof field === 'string')
}

function buildChangeList(event: AuditLog): ChangeItem[] {
  const details = event.details || {}
  const previousState = getState(details, 'estadoAnterior')
  const nextState = getState(details, 'estadoNovo')
  const fields = getChangedFields(details)

  if (event.action === 'DECISION_UPDATED' && fields.length > 0) {
    return fields
      .filter((field) => {
        if (!previousState || !nextState) return true
        return formatValue(previousState[field]) !== formatValue(nextState[field])
      })
      .map((field) => ({
        field: fieldLabels[field] || field,
        from: previousState ? formatValue(previousState[field]) : undefined,
        to: nextState ? formatValue(nextState[field]) : undefined,
      }))
  }

  if (event.action === 'DECISION_ARCHIVED') {
    return [{ field: 'Status', from: 'Pendente/Concluída', to: 'Arquivada' }]
  }

  if (event.action === 'DECISION_UNARCHIVED') {
    return [{ field: 'Status', from: 'Arquivada', to: 'Pendente' }]
  }

  if (event.action === 'DECISION_DELETED') {
    return [{ field: 'Situação', from: 'Disponível', to: 'Removida da listagem' }]
  }

  return []
}

function getActionSummary(event: AuditLog) {
  switch (event.action) {
    case 'DECISION_CREATED':
      return 'Criou a decisão'
    case 'DECISION_UPDATED':
      return 'Alterou campos da decisão'
    case 'DECISION_ARCHIVED':
      return 'Arquivou a decisão'
    case 'DECISION_UNARCHIVED':
      return 'Desarquivou a decisão'
    case 'DECISION_DELETED':
      return 'Removeu a decisão da listagem'
    default:
      return actionLabels[event.action] || event.action
  }
}

function getEmptyChangeMessage(event: AuditLog) {
  if (event.action === 'DECISION_CREATED') {
    return 'Registro criado sem campos anteriores para comparar.'
  }

  return 'Nenhum campo de negócio mudou neste evento.'
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
      {events.length === 0 ? (
        <p className="empty-message">{emptyMessage}</p>
      ) : (
        <div className="audit-event-list">
          {events.map((event) => {
            const details = event.details || {}
            const changes = buildChangeList(event)

            return (
              <article key={event.id} className="audit-event-card">
                <div className="audit-event-main">
                  <div className="audit-event-icon">
                    <FileText />
                  </div>
                  <div>
                    <span className="audit-event-action">{getActionSummary(event)}</span>
                    <h3>{getDecisionTitle(details)}</h3>
                  </div>
                </div>
                <div className="audit-event-meta">
                  <span>
                    <UserIcon />
                    {getActor(event)}
                  </span>
                  <time>
                    <Clock />
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(event.timestamp))}
                  </time>
                </div>
                {event.userEmail && event.userEmail !== event.userName && (
                  <small className="timeline-meta">Responsável: {event.userEmail}</small>
                )}
                {changes.length > 0 ? (
                  <div className="audit-change-grid">
                    {changes.map((change) => (
                      <div key={`${event.id}-${change.field}`} className="audit-change-item">
                        <strong>{change.field}</strong>
                        {change.from !== undefined || change.to !== undefined ? (
                          <span>
                            <em>{change.from || 'Não informado'}</em>
                            <ArrowRight />
                            <em>{change.to || 'Não informado'}</em>
                          </span>
                        ) : (
                          <span>Campo alterado</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="audit-event-note">{getEmptyChangeMessage(event)}</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
