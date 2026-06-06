import { X } from 'lucide-react'
import { AuditList } from '../audit/AuditList'
import { Detail } from '../shared/Detail'
import type { AuditLog, DecisionView } from '../../types'

export function ViewDecisionModal({
  auditLogs,
  canAccessAudit,
  decision,
  onClose,
  onLoadAudit,
}: {
  auditLogs: AuditLog[]
  canAccessAudit: boolean
  decision: DecisionView | null
  onClose: () => void
  onLoadAudit: (decisionId: string) => void
}) {
  if (!decision) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Detalhes da Decisão</h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-content">
          <Detail label="ID da Decisão" value={`#${decision.id.slice(0, 8)}`} />
          <Detail label="Título" value={decision.titulo} />
          <div className="detail-grid">
            <Detail label="Departamento" value={decision.departamento} />
            <Detail label="Data" value={decision.data} />
          </div>
          <div className="detail-grid">
            <div>
              <p>Nível de Impacto</p>
              <span className={`tag impact-${decision.impacto.toLowerCase()}`}>{decision.impacto}</span>
            </div>
            <div>
              <p>Status</p>
              <span className={`tag status-${decision.status.toLowerCase()}`}>{decision.status}</span>
            </div>
          </div>
          <div>
            <p>Descrição Detalhada</p>
            <div className="description-box">{decision.descricao}</div>
          </div>
          {canAccessAudit && (
            <div>
              <button className="inline-action" type="button" onClick={() => onLoadAudit(decision.id)}>
                Ver histórico desta decisão
              </button>
              {auditLogs.length > 0 && <AuditList events={auditLogs} />}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
