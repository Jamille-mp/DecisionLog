import type { ApiRole, AuthForm, DecisionFormData, ImageFrameSettings, RoleLabel } from '../types'

export const emptyAuthForm: AuthForm = {
  companyAccessCode: '',
  companyName: '',
  name: '',
  email: '',
  password: '',
  acceptedTerms: false,
  acceptedPrivacy: false,
  resetToken: '',
}

export const emptyDecisionForm: DecisionFormData = {
  titulo: '',
  departamentoId: '',
  departamento: '',
  impacto: '',
  status: 'Pendente',
  descricao: '',
}

export const defaultImageFrameSettings: ImageFrameSettings = {
  zoom: 1,
  x: 0,
  y: 0,
}

export const roleLabels: Record<ApiRole, RoleLabel> = {
  admin: 'Administrador',
  manager: 'Gestor',
  auditor: 'Auditor',
}

export const labelToRole: Record<RoleLabel, ApiRole> = {
  Administrador: 'admin',
  Gestor: 'manager',
  Auditor: 'auditor',
}

export const actionLabels: Record<string, string> = {
  USER_REGISTERED: 'Usuário cadastrado',
  USER_LOGGED_IN: 'Login realizado',
  USER_LOGGED_IN_OIDC: 'Login institucional realizado',
  USER_UPDATED: 'Usuário atualizado',
  USER_DELETED: 'Usuário excluído',
  DEPARTMENT_CREATED: 'Departamento criado',
  DEPARTMENT_UPDATED: 'Departamento atualizado',
  DECISIONS_VIEWED: 'Decisões visualizadas',
  DECISION_CREATED: 'Decisão criada',
  DECISION_UPDATED: 'Decisão editada',
  DECISION_ARCHIVED: 'Decisão arquivada',
  DECISION_UNARCHIVED: 'Decisão desarquivada',
  DECISION_DELETED: 'Decisão inativada',
  COMPANY_REGISTERED: 'Empresa cadastrada',
}
