import type { AuditLog } from '../types'

export function buildDemoDecisionAuditEvents(): AuditLog[] {
  const now = Date.now()

  return [
    {
      id: 'demo-audit-1',
      action: 'DECISION_UPDATED',
      userId: 'gestor.demo',
      details: {
        title: 'Revisão do fluxo de aprovação',
        previousStatus: 'Pendente',
        nextStatus: 'Concluída',
      },
      timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
    },
    {
      id: 'demo-audit-2',
      action: 'DECISION_ARCHIVED',
      userId: 'admin.demo',
      details: {
        title: 'Política de acesso aos relatórios',
      },
      timestamp: new Date(now - 1000 * 60 * 55).toISOString(),
    },
    {
      id: 'demo-audit-3',
      action: 'DECISION_CREATED',
      userId: 'analista.demo',
      details: {
        title: 'Priorização de indicadores executivos',
      },
      timestamp: new Date(now - 1000 * 60 * 130).toISOString(),
    },
  ]
}
