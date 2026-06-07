import type { AuditLog } from '../types'

export function buildDemoDecisionAuditEvents(): AuditLog[] {
  const now = Date.now()

  return [
    {
      id: 'demo-audit-1',
      action: 'DECISION_UPDATED',
      userId: 'gestor.demo',
      userName: 'Mariana Costa',
      userEmail: 'mariana.costa@empresa.com',
      details: {
        title: 'Revisão do fluxo de aprovação',
        updatedFields: ['status', 'impact'],
        estadoAnterior: {
          status: 'pending',
          impact: 'medium',
          title: 'Revisão do fluxo de aprovação',
        },
        estadoNovo: {
          status: 'approved',
          impact: 'high',
          title: 'Revisão do fluxo de aprovação',
        },
      },
      timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
    },
    {
      id: 'demo-audit-2',
      action: 'DECISION_ARCHIVED',
      userId: 'admin.demo',
      userName: 'Renato Alves',
      userEmail: 'renato.alves@empresa.com',
      details: {
        title: 'Política de acesso aos relatórios',
      },
      timestamp: new Date(now - 1000 * 60 * 55).toISOString(),
    },
    {
      id: 'demo-audit-3',
      action: 'DECISION_CREATED',
      userId: 'analista.demo',
      userName: 'Camila Rocha',
      userEmail: 'camila.rocha@empresa.com',
      details: {
        title: 'Priorização de indicadores executivos',
      },
      timestamp: new Date(now - 1000 * 60 * 130).toISOString(),
    },
  ]
}
