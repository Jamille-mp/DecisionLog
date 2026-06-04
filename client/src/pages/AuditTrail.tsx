import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { AuditList } from '../components/audit/AuditList'
import { PageHeader } from '../components/shared/PageHeader'
import { buildDemoDecisionAuditEvents } from '../services/demoAudit'
import type { AuditLog } from '../types'

export function AuditTrail({ events }: { events: AuditLog[] }) {
  const [actionFilter, setActionFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const hasRealDecisionEvents = events.some((event) => event.action.startsWith('DECISION_'))
  const sourceEvents = hasRealDecisionEvents ? events : buildDemoDecisionAuditEvents()
  const decisionEvents = sourceEvents.filter((event) => {
    if (!event.action.startsWith('DECISION_')) return false
    if (actionFilter && event.action !== actionFilter) return false
    const eventDate = new Date(event.timestamp).toISOString().slice(0, 10)
    if (dateFromFilter && eventDate < dateFromFilter) return false
    if (dateToFilter && eventDate > dateToFilter) return false
    return true
  })
  const hasFilters = Boolean(actionFilter || dateFromFilter || dateToFilter)
  const createdEvents = decisionEvents.filter((event) => event.action === 'DECISION_CREATED').length
  const updatedEvents = decisionEvents.filter((event) => event.action === 'DECISION_UPDATED').length
  const archivedEvents = decisionEvents.filter(
    (event) => event.action === 'DECISION_ARCHIVED' || event.action === 'DECISION_UNARCHIVED',
  ).length

  function clearFilters() {
    setActionFilter('')
    setDateFromFilter('')
    setDateToFilter('')
  }

  return (
    <section className="page-section">
      <PageHeader
        badge="Auditoria"
        subtitle="Eventos relacionados a criação, edição, arquivamento e inativação de decisões."
        title="Histórico de Alterações nas Decisões"
      />
      {!hasRealDecisionEvents && (
        <div className="demo-notice">
          <strong>Exemplos de atividade</strong>
          <span>
            O MongoDB ainda não retornou logs reais nesta sessão; os eventos abaixo simulam como a auditoria aparece
            quando decisões são criadas, editadas ou arquivadas.
          </span>
        </div>
      )}
      <div className="admin-summary-grid">
        <article>
          <span>Criações</span>
          <strong>{createdEvents}</strong>
        </article>
        <article>
          <span>Edições</span>
          <strong>{updatedEvents}</strong>
        </article>
        <article>
          <span>Arquivamentos</span>
          <strong>{archivedEvents}</strong>
        </article>
      </div>
      <div className="audit-filter-panel">
        <div className="filter-grid">
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            <option value="">Todas as alterações</option>
            <option value="DECISION_CREATED">Criação</option>
            <option value="DECISION_UPDATED">Edição</option>
            <option value="DECISION_ARCHIVED">Arquivamento</option>
            <option value="DECISION_UNARCHIVED">Desarquivamento</option>
            <option value="DECISION_DELETED">Inativação</option>
          </select>
          <label className="date-filter">
            <span>De</span>
            <input type="date" value={dateFromFilter} onChange={(event) => setDateFromFilter(event.target.value)} />
          </label>
          <label className="date-filter">
            <span>Até</span>
            <input type="date" value={dateToFilter} onChange={(event) => setDateToFilter(event.target.value)} />
          </label>
        </div>
        {hasFilters && (
          <button className="clear-filters" type="button" onClick={clearFilters}>
            <RotateCcw />
            Limpar filtros
          </button>
        )}
      </div>
      <AuditList events={decisionEvents} emptyMessage="Nenhuma alteração de decisão registrada" />
    </section>
  )
}
