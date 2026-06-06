import type { ReactNode } from 'react'

export type Page = 'dashboard' | 'new-decision' | 'history' | 'audit' | 'users' | 'departments' | 'profile' | 'help' | 'monitoring'
export type ApiRole = 'admin' | 'manager' | 'auditor'
export type RoleLabel = 'Administrador' | 'Gestor' | 'Auditor'
export type ApiStatus = 'pending' | 'approved' | 'archived' | 'inactive'
export type ApiImpact = 'low' | 'medium' | 'high'

export type Company = {
  id: string
  name: string
  slug: string
  accessCode?: string
  logoUrl?: string | null
}

export type Department = {
  id: string
  name: string
  active: boolean
  deletedAt?: string | null
  userCount?: number
  decisionCount?: number
  _count?: {
    users: number
    decisions: number
  }
}

export type User = {
  id: string
  companyId?: string
  company?: Company | null
  name: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  preferredTheme?: 'light' | 'dark'
  departmentId?: string | null
  department?: Department | null
  role: ApiRole
  active: boolean
  createdAt?: string
}

export type Health = {
  status: string
  service?: string
  checks: {
    mysql: string
    mongodb: string
    events: {
      mode?: string
      state: string
      failureCount: number
      publishedEvents: number
    }
  }
}

export type ApiDecision = {
  id: string
  title: string
  context: string
  decision: string
  reason: string
  department: string
  departmentId?: string | null
  departmentRef?: Department | null
  impact: ApiImpact
  status: ApiStatus
  active: boolean
  createdAt: string
  user?: User | null
}

export type DecisionView = {
  id: string
  titulo: string
  departamento: string
  departamentoId?: string | null
  impacto: 'Baixo' | 'Médio' | 'Alto'
  status: 'Pendente' | 'Concluída' | 'Arquivada' | 'Inativa'
  data: string
  descricao: string
  autor: string
  source: ApiDecision
}

export type AuditLog = {
  id: string
  action: string
  userId?: string
  details?: Record<string, unknown>
  timestamp: string
}

export type DecisionFormData = {
  titulo: string
  departamentoId: string
  departamento: string
  impacto: 'Baixo' | 'Médio' | 'Alto' | ''
  status: 'Pendente' | 'Concluída'
  descricao: string
}

export type AuthForm = {
  companyAccessCode: string
  companyName: string
  name: string
  email: string
  password: string
  acceptedTerms: boolean
  acceptedPrivacy: boolean
  resetToken: string
}

export type AuthMode = 'login' | 'register' | 'company-register' | 'forgot' | 'reset'

export type OidcConfig = {
  enabled: boolean
  providerName: string
}

export type ProfileFormData = {
  name: string
  email: string
  phone: string
  preferredTheme: 'light' | 'dark'
  currentPassword: string
  newPassword: string
}

export type PageHeaderProps = {
  actions?: ReactNode
  badge?: string
  subtitle?: string
  title: string
}
