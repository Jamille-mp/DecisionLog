import type { ApiDecision, ApiImpact, ApiStatus, DecisionFormData, DecisionView } from '../types'

export const impactToApi: Record<Exclude<DecisionFormData['impacto'], ''>, ApiImpact> = {
  Baixo: 'low',
  Médio: 'medium',
  Alto: 'high',
}

export const impactToView: Record<ApiImpact, DecisionView['impacto']> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
}

export const statusToApi: Record<DecisionFormData['status'], ApiStatus> = {
  Pendente: 'pending',
  Concluída: 'approved',
}

export const statusToView: Record<ApiStatus, DecisionView['status']> = {
  pending: 'Pendente',
  approved: 'Concluída',
  archived: 'Arquivada',
  inactive: 'Inativa',
}

export function toDecisionView(decision: ApiDecision): DecisionView {
  return {
    id: decision.id,
    titulo: decision.title,
    departamento: decision.departmentRef?.name || decision.department,
    departamentoId: decision.departmentId,
    impacto: impactToView[decision.impact],
    status: statusToView[decision.status],
    data: new Intl.DateTimeFormat('pt-BR').format(new Date(decision.createdAt)),
    descricao: decision.reason || decision.decision,
    autor: decision.user?.name || 'Registro anterior ao login',
    source: decision,
  }
}

export function toPayload(form: DecisionFormData) {
  return {
    title: form.titulo,
    context: form.descricao,
    decision: form.descricao,
    reason: form.descricao,
    department: form.departamento,
    departmentId: form.departamentoId,
    impact: impactToApi[form.impacto || 'Médio'],
    status: statusToApi[form.status],
  }
}
