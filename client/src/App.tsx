import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RotateCcw,
  Search,
  Settings,
  Sun,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Toaster, toast } from 'sonner'
import logo from './assets/decisionlog-logo.png'
import './App.css'

type Page = 'dashboard' | 'new-decision' | 'history' | 'audit' | 'users' | 'departments' | 'profile' | 'help' | 'monitoring'
type ApiRole = 'admin' | 'manager' | 'auditor'
type RoleLabel = 'Administrador' | 'Gestor' | 'Auditor'
type ApiStatus = 'pending' | 'approved' | 'archived' | 'inactive'
type ApiImpact = 'low' | 'medium' | 'high'

type User = {
  id: string
  companyId?: string
  company?: {
    id: string
    name: string
    slug: string
  } | null
  name: string
  email: string
  phone?: string | null
  preferredTheme?: 'light' | 'dark'
  departmentId?: string | null
  department?: Department | null
  role: ApiRole
  active: boolean
  createdAt?: string
}

type Department = {
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

type Health = {
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

type ApiDecision = {
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

type DecisionView = {
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

type AuditLog = {
  id: string
  action: string
  userId?: string
  details?: Record<string, unknown>
  timestamp: string
}

type DecisionFormData = {
  titulo: string
  departamentoId: string
  departamento: string
  impacto: 'Baixo' | 'Médio' | 'Alto' | ''
  status: 'Pendente' | 'Concluída'
  descricao: string
}

type AuthForm = {
  companyName: string
  name: string
  email: string
  password: string
  acceptedTerms: boolean
  acceptedPrivacy: boolean
  resetToken: string
}

type AuthMode = 'login' | 'register' | 'company-register' | 'forgot' | 'reset'
type OidcConfig = {
  enabled: boolean
  providerName: string
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333'

const emptyAuthForm: AuthForm = {
  companyName: '',
  name: '',
  email: '',
  password: '',
  acceptedTerms: false,
  acceptedPrivacy: false,
  resetToken: '',
}

const emptyDecisionForm: DecisionFormData = {
  titulo: '',
  departamentoId: '',
  departamento: '',
  impacto: '',
  status: 'Pendente',
  descricao: '',
}

type ProfileFormData = {
  name: string
  email: string
  phone: string
  preferredTheme: 'light' | 'dark'
  currentPassword: string
  newPassword: string
}

const roleLabels: Record<ApiRole, RoleLabel> = {
  admin: 'Administrador',
  manager: 'Gestor',
  auditor: 'Auditor',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function isStrongPassword(password: string) {
  const hasMinimumLength = password.length >= 8
  const hasLetter = /[A-Za-zÀ-ÿ]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-zÀ-ÿ0-9]/.test(password)
  const hasSequentialNumbers = /(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210)/.test(password)

  return hasMinimumLength && hasLetter && hasNumber && hasSpecial && !hasSequentialNumbers
}

function formatDateTime(value?: string) {
  if (!value) return 'Não informado'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toIsoDateFromBrazilianDate(value: string) {
  const [day, month, year] = value.split('/')
  if (!day || !month || !year) return ''

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const labelToRole: Record<RoleLabel, ApiRole> = {
  Administrador: 'admin',
  Gestor: 'manager',
  Auditor: 'auditor',
}

const actionLabels: Record<string, string> = {
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
}

function buildDemoDecisionAuditEvents(): AuditLog[] {
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

const impactToApi: Record<Exclude<DecisionFormData['impacto'], ''>, ApiImpact> = {
  Baixo: 'low',
  Médio: 'medium',
  Alto: 'high',
}

const impactToView: Record<ApiImpact, DecisionView['impacto']> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
}

const statusToApi: Record<DecisionFormData['status'], ApiStatus> = {
  Pendente: 'pending',
  Concluída: 'approved',
}

const statusToView: Record<ApiStatus, DecisionView['status']> = {
  pending: 'Pendente',
  approved: 'Concluída',
  archived: 'Arquivada',
  inactive: 'Inativa',
}

function toDecisionView(decision: ApiDecision): DecisionView {
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

function toPayload(form: DecisionFormData) {
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

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuthForm)
  const [token, setToken] = useState(() => localStorage.getItem('decisionlog:token') || '')
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('decisionlog:user')
    return storedUser ? (JSON.parse(storedUser) as User) : null
  })
  const [oidcConfig, setOidcConfig] = useState<OidcConfig>({ enabled: false, providerName: 'Login institucional' })
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [pageHistory, setPageHistory] = useState<Page[]>([])
  const [decisions, setDecisions] = useState<ApiDecision[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [decisionAuditLogs, setDecisionAuditLogs] = useState<AuditLog[]>([])
  const [selectedDecision, setSelectedDecision] = useState<DecisionView | null>(null)
  const [editingDecision, setEditingDecision] = useState<DecisionView | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const canAccessAudit = user?.role === 'admin' || user?.role === 'auditor'
  const isAdmin = user?.role === 'admin'
  const canGoBack = currentPage !== 'dashboard' && (pageHistory.length > 0 || Boolean(editingDecision))
  const userProfile = {
    name: user?.name || 'Usuário',
    role: roleLabels[user?.role || 'manager'],
    initials: (user?.name || 'Usuário')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase(),
    company: user?.company?.name || 'Empresa',
  }

  const decisionViews = useMemo(() => decisions.map(toDecisionView), [decisions])

  useEffect(() => {
    fetch(`${apiUrl}/auth/oidc/config`)
      .then((response) => response.json())
      .then((data: OidcConfig) => setOidcConfig(data))
      .catch(() => setOidcConfig({ enabled: false, providerName: 'Login institucional' }))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const oidcToken = params.get('oidc_token')

    if (!oidcToken) return

    localStorage.setItem('decisionlog:token', oidcToken)
    window.history.replaceState({}, document.title, window.location.pathname)

    fetch(`${apiUrl}/users/me`, {
      headers: authHeaders(oidcToken),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Falha ao carregar perfil OpenID.')
        return (await response.json()) as User
      })
      .then((profile) => {
        localStorage.setItem('decisionlog:user', JSON.stringify(profile))
        setToken(oidcToken)
        setUser(profile)
        document.body.dataset.theme = profile.preferredTheme || 'light'
        toast.success('Login institucional realizado.')
      })
      .catch(() => {
        localStorage.removeItem('decisionlog:token')
        localStorage.removeItem('decisionlog:user')
        setToken('')
        setUser(null)
        toast.error('Não foi possível concluir o login institucional.')
      })
  }, [])

  useEffect(() => {
    document.body.dataset.theme = user?.preferredTheme || 'light'
  }, [user?.preferredTheme])

  useEffect(() => {
    if (!isProfileMenuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileMenuOpen])

  useEffect(() => {
    if (!token || !user) return

    let isCurrent = true

    async function loadInitialData() {
      setIsLoading(true)
      try {
        const requests = [
          fetch(`${apiUrl}/decisions`, { headers: authHeaders(token) }),
          fetch(`${apiUrl}/departments${isAdmin ? '?includeInactive=true' : ''}`, { headers: authHeaders(token) }),
          fetch(`${apiUrl}/health`),
        ]

        if (canAccessAudit) {
          requests.push(fetch(`${apiUrl}/audit-logs`, { headers: authHeaders(token) }))
        }

        if (isAdmin) {
          requests.push(fetch(`${apiUrl}/users`, { headers: authHeaders(token) }))
        }

        const responses = await Promise.all(requests)

        if (responses.some((response) => !response.ok)) {
          throw new Error('Falha ao carregar dados iniciais.')
        }

        const loadedDecisions = (await responses[0].json()) as ApiDecision[]
        const loadedDepartments = (await responses[1].json()) as Department[]
        const loadedHealth = (await responses[2].json()) as Health
        let cursor = 3
        const loadedAuditLogs = canAccessAudit ? ((await responses[cursor++].json()) as AuditLog[]) : []
        const loadedUsers = isAdmin ? ((await responses[cursor].json()) as User[]) : []

        if (isCurrent) {
          setDecisions(loadedDecisions)
          setDepartments(loadedDepartments)
          setHealth(loadedHealth)
          setAuditLogs(loadedAuditLogs)
          setUsers(loadedUsers)
        }
      } catch {
        toast.error('Sessão expirada ou API indisponível.')
        handleLogout()
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      isCurrent = false
    }
  }, [token, user, canAccessAudit, isAdmin])

  async function refreshAuditLogs(currentToken = token) {
    if (!currentToken || !canAccessAudit) return

    const response = await fetch(`${apiUrl}/audit-logs`, {
      headers: authHeaders(currentToken),
    })

    if (response.ok) {
      setAuditLogs((await response.json()) as AuditLog[])
    }
  }

  async function refreshDepartments(currentToken = token) {
    const response = await fetch(`${apiUrl}/departments${isAdmin ? '?includeInactive=true' : ''}`, {
      headers: authHeaders(currentToken),
    })

    if (response.ok) {
      setDepartments((await response.json()) as Department[])
    }
  }

  async function refreshUsers(currentToken = token) {
    if (!isAdmin) return

    const response = await fetch(`${apiUrl}/users`, {
      headers: authHeaders(currentToken),
    })

    if (response.ok) {
      setUsers((await response.json()) as User[])
    }
  }

  async function loadDecisionAudit(decisionId: string) {
    if (!canAccessAudit) return

    const response = await fetch(`${apiUrl}/audit-logs/decisions/${decisionId}`, {
      headers: authHeaders(token),
    })

    if (!response.ok) {
      toast.error('Não foi possível carregar o histórico da decisão.')
      return
    }

    setDecisionAuditLogs((await response.json()) as AuditLog[])
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if ((authMode === 'register' || authMode === 'company-register' || authMode === 'reset') && !isStrongPassword(authForm.password)) {
      toast.error('A senha deve ter 8 caracteres ou mais, com letra, número, caractere especial e sem sequência numérica.')
      return
    }

    setIsSubmitting(true)

    try {
      if (authMode === 'forgot') {
        const response = await fetch(`${apiUrl}/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: authForm.email }),
        })

        if (!response.ok) {
          throw new Error('Falha ao solicitar recuperação de senha.')
        }

        const data = (await response.json()) as { message: string; resetToken?: string }
        toast.success(data.message)
        setAuthMode('reset')
        setAuthForm((current) => ({ ...current, resetToken: data.resetToken || '' }))
        return
      }

      if (authMode === 'reset') {
        const response = await fetch(`${apiUrl}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: authForm.resetToken,
            password: authForm.password,
          }),
        })

        if (!response.ok) {
          throw new Error('Falha ao redefinir senha.')
        }

        toast.success('Senha atualizada. Faça login para continuar.')
        setAuthMode('login')
        setAuthForm(emptyAuthForm)
        return
      }

      const endpoint =
        authMode === 'login'
          ? 'login'
          : authMode === 'company-register'
            ? 'register-company'
            : 'register'
      const body =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authMode === 'company-register'
            ? {
                companyName: authForm.companyName,
                name: authForm.name,
                email: authForm.email,
                password: authForm.password,
                acceptedTerms: authForm.acceptedTerms,
                acceptedPrivacy: authForm.acceptedPrivacy,
              }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
              acceptedTerms: authForm.acceptedTerms,
              acceptedPrivacy: authForm.acceptedPrivacy,
            }

      const response = await fetch(`${apiUrl}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Falha na autenticação.')
      }

      if (authMode === 'register' || authMode === 'company-register') {
        toast.success(authMode === 'company-register' ? 'Empresa cadastrada. Faça login como administrador.' : 'Usuário cadastrado. Faça login para continuar.')
        setAuthMode('login')
        setAuthForm(emptyAuthForm)
        return
      }

      const data = (await response.json()) as { token: string; user: User }
      localStorage.setItem('decisionlog:token', data.token)
      localStorage.setItem('decisionlog:user', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      setAuthForm(emptyAuthForm)
      toast.success('Login realizado.')
    } catch {
      toast.error('Não foi possível autenticar. Confira os dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('decisionlog:token')
    localStorage.removeItem('decisionlog:user')
    setToken('')
    setUser(null)
    setCurrentPage('dashboard')
    setPageHistory([])
    setDecisions([])
    setDepartments([])
    setUsers([])
    setAuditLogs([])
    setDecisionAuditLogs([])
  }

  function handleOidcLogin() {
    window.location.href = `${apiUrl}/auth/oidc/start`
  }

  async function handleSaveDecision(formData: DecisionFormData) {
    setIsSubmitting(true)

    try {
      const payload = toPayload(formData)
      const response = await fetch(
        editingDecision ? `${apiUrl}/decisions/${editingDecision.id}` : `${apiUrl}/decisions`,
        {
          method: editingDecision ? 'PUT' : 'POST',
          headers: {
            ...authHeaders(token),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) {
        throw new Error('Não foi possível salvar a decisão.')
      }

      const savedDecision = (await response.json()) as ApiDecision

      setDecisions((current) =>
        editingDecision
          ? current.map((item) => (item.id === savedDecision.id ? savedDecision : item))
          : [savedDecision, ...current],
      )
      setEditingDecision(null)
      setCurrentPage('history')
      toast.success(editingDecision ? 'Decisão atualizada.' : 'Decisão registrada com sucesso.')
      void refreshAuditLogs()
    } catch {
      toast.error('Erro ao salvar decisão. Verifique se a API está rodando.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteDecision(id: string) {
    const confirmed = window.confirm('Deseja realmente inativar esta decisão?')
    if (!confirmed) return

    try {
      const response = await fetch(`${apiUrl}/decisions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      })

      if (!response.ok) {
        throw new Error('Não foi possível inativar a decisão.')
      }

      setDecisions((current) => current.filter((decision) => decision.id !== id))
      toast.success('Decisão inativada.')
      void refreshAuditLogs()
    } catch {
      toast.error('Erro ao inativar decisão.')
    }
  }

  async function handleArchiveDecision(decision: DecisionView) {
    const shouldUnarchive = decision.status === 'Arquivada'
    const nextStatus = shouldUnarchive ? 'pending' : 'archived'
    const response = await fetch(`${apiUrl}/decisions/${decision.id}`, {
      method: 'PUT',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: decision.source.title,
        context: decision.source.context,
        decision: decision.source.decision,
        reason: decision.source.reason,
        department: decision.source.department,
        departmentId: decision.source.departmentId,
        impact: decision.source.impact,
        status: nextStatus,
      }),
    })

    if (!response.ok) {
      toast.error(shouldUnarchive ? 'Não foi possível desarquivar a decisão.' : 'Não foi possível arquivar a decisão.')
      return
    }

    const archivedDecision = (await response.json()) as ApiDecision
    setDecisions((current) => current.map((item) => (item.id === archivedDecision.id ? archivedDecision : item)))
    toast.success(shouldUnarchive ? 'Decisão desarquivada.' : 'Decisão arquivada.')
    void refreshAuditLogs()
  }

  async function handleDeleteUser(userId: string) {
    const confirmed = window.confirm('Deseja realmente excluir este usuário? A conta será desativada e descaracterizada.')
    if (!confirmed) return

    const response = await fetch(`${apiUrl}/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    })

    if (!response.ok) {
      toast.error('Não foi possível excluir o usuário.')
      return
    }

    setUsers((current) => current.filter((item) => item.id !== userId))
    toast.success('Usuário excluído.')
    void refreshUsers()
    void refreshAuditLogs()
  }

  async function handleUpdateUser(userId: string, data: Partial<Pick<User, 'role' | 'active' | 'departmentId'>>) {
    const response = await fetch(`${apiUrl}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      toast.error('Não foi possível atualizar o usuário.')
      return
    }

    toast.success('Usuário atualizado.')
    void refreshUsers()
    void refreshAuditLogs()
  }

  async function handleCreateDepartment(name: string) {
    const response = await fetch(`${apiUrl}/departments`, {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      toast.error('Não foi possível criar o departamento.')
      return
    }

    toast.success('Departamento criado.')
    void refreshDepartments()
    void refreshAuditLogs()
  }

  async function handleToggleDepartment(department: Department) {
    const response = await fetch(`${apiUrl}/departments/${department.id}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ active: !department.active }),
    })

    if (!response.ok) {
      toast.error('Não foi possível atualizar o departamento.')
      return
    }

    toast.success('Departamento atualizado.')
    void refreshDepartments()
    void refreshAuditLogs()
  }

  async function handleUpdateDepartment(department: Department, name: string) {
    const response = await fetch(`${apiUrl}/departments/${department.id}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      toast.error('Não foi possível renomear o departamento.')
      return
    }

    toast.success('Departamento renomeado.')
    void refreshDepartments()
    void refreshAuditLogs()
  }

  async function handleDeleteDepartment(department: Department) {
    const confirmed = window.confirm('Deseja realmente excluir este departamento? Ele será removido da gestão ativa.')
    if (!confirmed) return

    const response = await fetch(`${apiUrl}/departments/${department.id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    })

    if (!response.ok) {
      toast.error('Não foi possível excluir o departamento.')
      return
    }

    toast.success('Departamento excluído.')
    void refreshDepartments()
    void refreshAuditLogs()
  }

  async function handleUpdateProfile(data: ProfileFormData) {
    setIsSubmitting(true)

    try {
      const payload: Record<string, string> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        preferredTheme: data.preferredTheme,
      }

      if (data.newPassword) {
        payload.currentPassword = data.currentPassword
        payload.newPassword = data.newPassword
      }

      const response = await fetch(`${apiUrl}/users/me`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Não foi possível atualizar o perfil.')
      }

      const updatedUser = (await response.json()) as User
      localStorage.setItem('decisionlog:user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      toast.success('Perfil atualizado.')
      void refreshAuditLogs()
    } catch {
      toast.error('Não foi possível atualizar o perfil. Confira os dados.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function navigateTo(page: Page) {
    if (page === 'new-decision' && user?.role === 'auditor') {
      toast.error('Auditores podem consultar, mas não registrar decisões.')
      return
    }

    if (page === 'audit' && !canAccessAudit) {
      toast.error('Apenas administradores e auditores acessam a auditoria.')
      return
    }

    if ((page === 'users' || page === 'departments' || page === 'monitoring') && !isAdmin) {
      toast.error('Apenas administradores acessam esta área.')
      return
    }

    if (page !== currentPage) {
      setPageHistory((current) => [...current, currentPage])
      setCurrentPage(page)
    }
    setIsSidebarOpen(false)
    setIsProfileMenuOpen(false)
  }

  function openDecision(decision: DecisionView) {
    setSelectedDecision(decision)
    setDecisionAuditLogs([])
  }

  function openProfile() {
    setPageHistory((current) => [...current, currentPage])
    setCurrentPage('profile')
    setIsProfileMenuOpen(false)
    setIsSidebarOpen(false)
  }

  function goBack() {
    if (editingDecision) {
      setEditingDecision(null)
      setCurrentPage('history')
      return
    }

    setPageHistory((current) => {
      const nextHistory = [...current]
      const previousPage = nextHistory.pop()
      setCurrentPage(previousPage || 'dashboard')
      return nextHistory
    })
    setIsProfileMenuOpen(false)
    setIsSidebarOpen(false)
  }

  function renderContent() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard decisions={decisionViews} health={health} isAdmin={isAdmin} isLoading={isLoading} usersCount={users.filter((item) => item.active).length} />
      case 'new-decision':
        return (
          <NewDecision
            key={editingDecision?.id || 'new'}
            departments={departments}
            editingDecision={editingDecision}
            isSubmitting={isSubmitting}
            onCancelEdit={() => {
              setEditingDecision(null)
              setCurrentPage('history')
            }}
            onSave={handleSaveDecision}
            userRole={userProfile.role}
          />
        )
      case 'history':
        return (
          <DecisionHistory
            decisions={decisionViews}
            userRole={userProfile.role}
            onEdit={(decision) => {
              setEditingDecision(decision)
              setPageHistory((current) => [...current, currentPage])
              setCurrentPage('new-decision')
            }}
            onDelete={handleDeleteDecision}
            onArchive={handleArchiveDecision}
            onView={openDecision}
            currentUserId={user?.id}
          />
        )
      case 'audit':
        return <AuditTrail events={auditLogs} />
      case 'users':
        return (
          <UsersPage
            currentUserId={user?.id}
            departments={departments}
            onDelete={handleDeleteUser}
            onUpdate={handleUpdateUser}
            users={users}
          />
        )
      case 'departments':
        return (
          <DepartmentsPage
            departments={departments}
            onCreate={handleCreateDepartment}
            onDelete={handleDeleteDepartment}
            onRename={handleUpdateDepartment}
            onToggle={handleToggleDepartment}
          />
        )
      case 'profile':
        return user ? (
          <ProfilePage isSubmitting={isSubmitting} onSave={handleUpdateProfile} user={user} />
        ) : null
      case 'help':
        return <HelpPage userRole={userProfile.role} companyName={userProfile.company} />
      case 'monitoring':
        return <MonitoringPage auditLogs={auditLogs} health={health} token={token} />
      default:
        return <Dashboard decisions={decisionViews} health={health} isAdmin={isAdmin} isLoading={isLoading} usersCount={users.filter((item) => item.active).length} />
    }
  }

  if (!token || !user) {
    return (
      <>
        <Toaster richColors position="top-right" />
        <Login
          authForm={authForm}
          authMode={authMode}
          isSubmitting={isSubmitting}
          onChange={setAuthForm}
          onOpenLegal={setLegalModal}
          onModeChange={setAuthMode}
          onOidcLogin={handleOidcLogin}
          onSubmit={handleAuthSubmit}
          oidcConfig={oidcConfig}
        />
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      </>
    )
  }

  return (
    <div className="app-frame">
      <Toaster richColors position="top-right" />
      <header className="topbar">
        <button
          className="menu-trigger"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu />
        </button>
        {canGoBack && (
          <button className="back-button" type="button" onClick={goBack}>
            <ArrowLeft />
          </button>
        )}
        <div className="topbar-brand">
          <img src={logo} alt="DecisionLog" />
          <button className="brand-button" type="button" onClick={() => navigateTo('dashboard')}>
            <strong>DecisionLog</strong>
            <span>Governança de decisões</span>
          </button>
        </div>
        <div className="profile-menu-wrap" ref={profileMenuRef}>
          <button
            className="profile-floating"
            type="button"
            onClick={() => setIsProfileMenuOpen((current) => !current)}
            aria-label="Abrir ajustes de perfil"
          >
            {userProfile.initials}
          </button>
          {isProfileMenuOpen && (
            <div className="profile-popover">
              <div className="profile-popover-header">
                <strong>{userProfile.name}</strong>
                <span>{userProfile.role} · {userProfile.company}</span>
              </div>
              <button type="button" onClick={openProfile}>
                <Settings />
                Ajustes de perfil
              </button>
              <button type="button" onClick={() => navigateTo('help')}>
                <FileText />
                Ajuda e sobre o sistema
              </button>
              <button type="button" onClick={handleLogout}>
                <LogOut />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>
      <Sidebar
        canAccessAdmin={isAdmin}
        canAccessAudit={canAccessAudit}
        currentPage={currentPage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={navigateTo}
        userProfile={userProfile}
      />
      {isSidebarOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}
      <main className="content-area">
        {renderContent()}
        <AppFooter health={health} />
      </main>
      <ViewDecisionModal
        auditLogs={decisionAuditLogs}
        canAccessAudit={canAccessAudit}
        decision={selectedDecision}
        onClose={() => setSelectedDecision(null)}
        onLoadAudit={loadDecisionAudit}
      />
    </div>
  )
}

function Login({
  authForm,
  authMode,
  isSubmitting,
  onChange,
  onOpenLegal,
  onModeChange,
  onOidcLogin,
  onSubmit,
  oidcConfig,
}: {
  authForm: AuthForm
  authMode: AuthMode
  isSubmitting: boolean
  onChange: (form: AuthForm) => void
  onOpenLegal: (type: 'terms' | 'privacy') => void
  onModeChange: (mode: AuthMode) => void
  onOidcLogin: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  oidcConfig: OidcConfig
}) {
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const authTitle =
    authMode === 'company-register'
      ? 'Cadastrar empresa'
      : authMode === 'register'
      ? 'Criar acesso'
      : authMode === 'forgot'
        ? 'Recuperar senha'
        : authMode === 'reset'
          ? 'Redefinir senha'
          : 'Entrar na plataforma'
  const authDescription =
    authMode === 'company-register'
      ? 'Cadastre a empresa e crie o primeiro administrador do ambiente corporativo.'
      : authMode === 'register'
      ? 'Solicite seu acesso com aceite dos termos e política de privacidade.'
      : authMode === 'forgot'
        ? 'Informe seu e-mail corporativo para receber as instruções de recuperação.'
        : authMode === 'reset'
          ? 'Digite o código recebido e cadastre uma nova senha segura.'
          : 'Use suas credenciais para acessar decisões, auditoria e indicadores.'

  if (!showLoginPanel) {
    return (
      <div className="presentation-page">
        <header className="presentation-topbar">
          <div>
            <img src={logo} alt="DecisionLog" />
            <div>
              <strong>DecisionLog</strong>
              <span>Governança de decisões</span>
            </div>
          </div>
          <div className="presentation-topbar-actions">
            <button className="presentation-login-button" type="button" onClick={() => setShowLoginPanel(true)}>
              Entrar
            </button>
          </div>
        </header>
        <main className="presentation-main" id="inicio">
          <section className="presentation-shell reveal-block">
            <div className="presentation-copy">
              <span>Decisões com contexto e confiança</span>
              <h1>Transforme decisões importantes em registros claros, seguros e fáceis de acompanhar.</h1>
              <p>
                O DecisionLog centraliza decisões corporativas, responsáveis, justificativas e histórico
                para que a equipe saiba exatamente o que foi decidido e por quê.
              </p>
              <div className="presentation-actions">
                <button type="button" onClick={() => setShowLoginPanel(true)}>
                  Acessar plataforma
                </button>
                <button className="secondary" type="button" onClick={() => {
                  setShowLoginPanel(true)
                  onModeChange('company-register')
                }}>
                  Cadastrar empresa
                </button>
              </div>
            </div>
            <div className="presentation-preview">
              <div className="preview-window">
                <div className="preview-heading">
                  <span>Prévia ilustrativa</span>
                  <strong>Painel de decisões</strong>
                </div>
                <div className="preview-kpis">
                  <article>
                    <span>Decisões registradas</span>
                    <strong>128</strong>
                  </article>
                  <article>
                    <span>Pendentes</span>
                    <strong>14</strong>
                  </article>
                  <article>
                    <span>Alto impacto</span>
                    <strong>9</strong>
                  </article>
                </div>
                <div className="preview-note">
                  <strong>Hoje</strong>
                  <span>3 decisões concluídas, 2 revisões abertas e 1 item arquivado para consulta futura.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="presentation-section reveal-block" id="sobre">
            <div className="presentation-section-heading">
              <span>Sobre</span>
              <h2>Um fluxo simples para decisões que precisam deixar rastro.</h2>
              <p>
                A plataforma foi pensada para ambientes corporativos em que decisões precisam ter contexto,
                responsável, histórico e evidências consultáveis sem depender de conversas soltas.
              </p>
            </div>
            <div className="presentation-process" aria-label="Ciclo de uso do DecisionLog">
              <article>
                <strong>1</strong>
                <span>Registre a decisão</span>
                <p>Informe contexto, área, impacto e responsável em um registro padronizado.</p>
              </article>
              <article>
                <strong>2</strong>
                <span>Acompanhe o status</span>
                <p>Visualize pendências, decisões concluídas e itens arquivados para consulta.</p>
              </article>
              <article>
                <strong>3</strong>
                <span>Consulte o histórico</span>
                <p>Recupere alterações e evidências quando houver auditoria ou prestação de contas.</p>
              </article>
            </div>
          </section>

          <section className="presentation-section presentation-benefits reveal-block" id="servicos">
            <div>
              <span>Menos ruído</span>
              <strong>Informações importantes ficam organizadas em um único lugar.</strong>
            </div>
            <div>
              <span>Mais responsabilidade</span>
              <strong>Cada decisão mantém responsável, área, impacto e justificativa.</strong>
            </div>
            <div>
              <span>Mais confiança</span>
              <strong>A equipe consulta dados e histórico sem depender de memória individual.</strong>
            </div>
          </section>

          <section className="presentation-section presentation-contact reveal-block" id="contato">
            <div>
              <span>Contato</span>
              <h2>Precisa falar com suporte ou com a equipe responsável?</h2>
              <div className="presentation-contact-list">
                <span>suporte@decisionlog.com</span>
                <span>(11) 4002-8922</span>
                <span>Atendimento em dias úteis, das 8h às 18h</span>
              </div>
            </div>
            <button type="button" onClick={() => setShowLoginPanel(true)}>
              Acessar área do cliente
            </button>
          </section>
        </main>

        <footer className="presentation-footer">
          <div>
            <strong>DecisionLog</strong>
            <span>Governança de decisões com rastreabilidade e segurança.</span>
          </div>
          <nav aria-label="Links institucionais">
            <span>Ambiente interno protegido por autenticação</span>
          </nav>
          <span>© 2026 DecisionLog. Todos os direitos reservados.</span>
        </footer>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-intro-panel">
          <div className="login-brand-block">
            <img src={logo} alt="DecisionLog" />
            <div>
              <span>Acesso corporativo</span>
              <h1>Entre para acompanhar decisões com clareza.</h1>
              <p>Use sua conta para registrar, consultar e auditar decisões conforme seu perfil de acesso.</p>
            </div>
          </div>
          <div className="login-assurance-list">
            <div>
              <strong>Permissões por perfil</strong>
              <span>Administrador, gestor e auditor veem apenas o que faz sentido para sua função.</span>
            </div>
            <div>
              <strong>Rastreabilidade</strong>
              <span>Alterações importantes ficam registradas para consulta e prestação de contas.</span>
            </div>
            <div>
              <strong>Privacidade</strong>
              <span>Cadastro com aceite de termos e tratamento de dados conforme LGPD.</span>
            </div>
          </div>
        </section>
        <div className="login-card">
          <button
            className="auth-back-button"
            type="button"
            onClick={() => {
              if (authMode === 'login') {
                setShowLoginPanel(false)
                return
              }

              onModeChange('login')
            }}
          >
            <ArrowLeft />
            {authMode === 'login' ? 'Apresentação' : 'Login'}
          </button>
          <div className="login-card-header">
            <img src={logo} alt="DecisionLog" />
            <div>
              <span>DecisionLog</span>
              <h2>{authTitle}</h2>
              <p>{authDescription}</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="login-form">
          {authMode === 'company-register' && (
            <div>
              <label htmlFor="companyName">Empresa</label>
              <input
                id="companyName"
                value={authForm.companyName}
                onChange={(event) => onChange({ ...authForm, companyName: event.target.value })}
                placeholder="Nome da empresa"
                required
              />
            </div>
          )}
          {(authMode === 'register' || authMode === 'company-register') && (
            <div>
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                value={authForm.name}
                onChange={(event) => onChange({ ...authForm, name: event.target.value })}
                placeholder="Seu nome completo"
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={authForm.email}
              onChange={(event) => onChange({ ...authForm, email: event.target.value })}
              placeholder="seu.email@empresa.com"
              required
            />
          </div>
          {authMode === 'reset' && (
            <div>
              <label htmlFor="resetToken">Código de recuperação</label>
              <input
                id="resetToken"
                value={authForm.resetToken}
                onChange={(event) => onChange({ ...authForm, resetToken: event.target.value })}
                placeholder="Cole o código recebido"
                required
              />
            </div>
          )}
          {authMode !== 'forgot' && (
            <div>
              <label htmlFor="password">{authMode === 'reset' ? 'Nova senha' : 'Senha'}</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={authMode === 'login' ? undefined : 8}
                  pattern={authMode === 'login' ? undefined : '^(?!.*(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210))(?=.*[A-Za-zÀ-ÿ])(?=.*\\d)(?=.*[^A-Za-zÀ-ÿ0-9]).{8,}$'}
                  title="Use 8 caracteres ou mais, com letra, número, caractere especial e sem sequência numérica."
                  value={authForm.password}
                  onChange={(event) => onChange({ ...authForm, password: event.target.value })}
                  placeholder={authMode === 'login' ? '********' : 'Ex: Decisão@26'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {authMode !== 'login' && (
                <small className="field-hint">Mínimo 8 caracteres, com letra, número, caractere especial e sem sequência numérica.</small>
              )}
            </div>
          )}
          {authMode === 'company-register' && (
            <small className="field-hint">O domínio do e-mail do administrador será usado como domínio autorizado da empresa.</small>
          )}
          {(authMode === 'register' || authMode === 'company-register') && (
            <div className="consent-box">
              <strong>Consentimento e privacidade</strong>
              <div className="legal-actions">
                <button type="button" onClick={() => onOpenLegal('terms')}>
                  Ler Termos de Uso
                </button>
                <button type="button" onClick={() => onOpenLegal('privacy')}>
                  Ler Política de Privacidade
                </button>
              </div>
              <label>
                <input
                  checked={authForm.acceptedTerms}
                  onChange={(event) => onChange({ ...authForm, acceptedTerms: event.target.checked })}
                  required
                  type="checkbox"
                />
                <span>
                  Li e aceito os{' '}
                  <button className="text-link" type="button" onClick={() => onOpenLegal('terms')}>
                    Termos de Uso
                  </button>{' '}
                  do DecisionLog.
                </span>
              </label>
              <label>
                <input
                  checked={authForm.acceptedPrivacy}
                  onChange={(event) => onChange({ ...authForm, acceptedPrivacy: event.target.checked })}
                  required
                  type="checkbox"
                />
                <span>Autorizo o tratamento dos meus dados conforme a LGPD e a Política de Privacidade.</span>
              </label>
            </div>
          )}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Aguarde...'
              : authMode === 'login'
                ? 'Entrar'
                : authMode === 'register'
                  ? 'Cadastrar'
                  : authMode === 'company-register'
                    ? 'Cadastrar empresa'
                  : authMode === 'forgot'
                    ? 'Enviar instruções'
                    : 'Redefinir senha'}
          </button>
          </form>
          {authMode === 'login' && oidcConfig.enabled && (
            <button className="oidc-button" type="button" onClick={onOidcLogin}>
              {oidcConfig.providerName}
            </button>
          )}
          {authMode === 'login' && (
            <div className="password-recovery-row">
              <button className="mode-button subtle" type="button" onClick={() => onModeChange('forgot')}>
                Esqueci minha senha
              </button>
            </div>
          )}
          <div className="auth-switcher">
            <button
              className="mode-button"
              type="button"
              onClick={() => onModeChange(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Criar uma conta' : 'Já tenho uma conta'}
            </button>
            {authMode === 'login' && (
              <button className="mode-button subtle" type="button" onClick={() => onModeChange('company-register')}>
                Cadastrar empresa
              </button>
            )}
          </div>
        </div>
      </div>
      <footer className="login-footer">
        <strong>DecisionLog</strong>
        <span>© 2026 DecisionLog. Todos os direitos reservados.</span>
      </footer>
    </div>
  )
}

function LegalModal({
  type,
  onClose,
}: {
  type: 'terms' | 'privacy' | null
  onClose: () => void
}) {
  if (!type) return null

  const isTerms = type === 'terms'

  return (
    <div className="modal-backdrop">
      <div className="modal-card legal-modal">
        <div className="modal-header">
          <h2>{isTerms ? 'Termos de Uso' : 'Política de Privacidade e LGPD'}</h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-content legal-content">
          <div className="legal-summary">
            <strong>{isTerms ? 'Antes de aceitar' : 'Tratamento de dados no DecisionLog'}</strong>
            <span>
              {isTerms
                ? 'Os termos explicam responsabilidades, uso permitido e consequências de uso indevido.'
                : 'A política explica quais dados são tratados, por qual motivo, quem acessa e quais direitos o usuário possui.'}
            </span>
          </div>
          {isTerms ? (
            <>
              <p>Ao utilizar o DecisionLog, o usuário declara que as informações registradas são verdadeiras e relacionadas às decisões da organização.</p>
              <p>O acesso é pessoal e não deve ser compartilhado. Cada ação pode ser registrada para fins de auditoria, rastreabilidade e segurança.</p>
              <p>O uso inadequado, a tentativa de acesso não autorizado ou a alteração indevida de registros podem levar à suspensão da conta.</p>
            </>
          ) : (
            <>
              <p>O DecisionLog trata nome, e-mail, telefone opcional, perfil de acesso e histórico de ações para autenticação, segurança e auditoria.</p>
              <p>Os dados são usados para identificar responsáveis por decisões e manter rastreabilidade, conforme os princípios de finalidade, necessidade e transparência da LGPD.</p>
              <p>O usuário pode atualizar seus dados de perfil na própria aplicação. Registros de auditoria são mantidos para integridade e prestação de contas.</p>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfilePage({
  isSubmitting,
  onSave,
  user,
}: {
  isSubmitting: boolean
  onSave: (data: ProfileFormData) => Promise<void>
  user: User
}) {
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    preferredTheme: user.preferredTheme || 'light',
    currentPassword: '',
    newPassword: '',
  })
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSave(formData)
    setFormData((current) => ({
      ...current,
      currentPassword: '',
      newPassword: '',
    }))
  }

  function updatePreferredTheme(preferredTheme: ProfileFormData['preferredTheme']) {
    document.body.dataset.theme = preferredTheme
    setFormData((current) => ({ ...current, preferredTheme }))
  }

  return (
    <section className="page-section">
      <PageHeader
        badge={roleLabels[user.role]}
        subtitle="Atualize seus dados de contato, e-mail, senha e preferências de visualização."
        title="Meu Perfil"
      />
      <form className="profile-settings-layout" onSubmit={handleSubmit}>
        <aside className="profile-overview">
          <div className="profile-avatar large">{getInitials(user.name)}</div>
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <div className="profile-overview-meta">
            <span>{roleLabels[user.role]}</span>
            <span>{user.department?.name || 'Sem departamento vinculado'}</span>
          </div>
        </aside>

        <div className="profile-settings-stack">
          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>Informações de contato</h2>
              <p>Dados visíveis para administradores e usados para identificar responsáveis por decisões.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="profileName">Nome</label>
                <input
                  id="profileName"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="profilePhone">Contato</label>
                <input
                  id="profilePhone"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: formatPhone(event.target.value) })}
                  inputMode="tel"
                  maxLength={15}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label>Departamento</label>
                <input value={user.department?.name || 'Não vinculado'} disabled />
              </div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>E-mail de acesso</h2>
              <p>Este e-mail é usado no login e na recuperação de senha.</p>
            </div>
            <div>
              <label htmlFor="profileEmail">E-mail</label>
              <input
                id="profileEmail"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                required
              />
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>Alterar senha</h2>
              <p>Preencha os campos abaixo apenas quando quiser trocar a senha.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="currentPassword">Senha atual</label>
                <div className="password-field">
                  <input
                    id="currentPassword"
                    type={visiblePasswords.current ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(event) => setFormData({ ...formData, currentPassword: event.target.value })}
                    placeholder="Senha usada atualmente"
                  />
                  <button
                    type="button"
                    onClick={() => setVisiblePasswords((current) => ({ ...current, current: !current.current }))}
                    aria-label={visiblePasswords.current ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                  >
                    {visiblePasswords.current ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="newPassword">Nova senha</label>
                <div className="password-field">
                  <input
                    id="newPassword"
                    type={visiblePasswords.next ? 'text' : 'password'}
                    minLength={8}
                    pattern="^(?!.*(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210))(?=.*[A-Za-zÀ-ÿ])(?=.*\d)(?=.*[^A-Za-zÀ-ÿ0-9]).{8,}$"
                    title="Use 8 caracteres ou mais, com letra, número, caractere especial e sem sequência numérica."
                    value={formData.newPassword}
                    onChange={(event) => setFormData({ ...formData, newPassword: event.target.value })}
                    placeholder="Ex: Decisão@26"
                  />
                  <button
                    type="button"
                    onClick={() => setVisiblePasswords((current) => ({ ...current, next: !current.next }))}
                    aria-label={visiblePasswords.next ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  >
                    {visiblePasswords.next ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <small className="field-hint">Mínimo 8 caracteres, com letra, número, caractere especial e sem sequência numérica.</small>
              </div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>Preferências de visualização</h2>
              <p>Escolha como deseja visualizar a plataforma neste navegador.</p>
            </div>
            <div className="theme-toggle">
              <button
                className={formData.preferredTheme === 'light' ? 'active' : ''}
                type="button"
                onClick={() => updatePreferredTheme('light')}
              >
                <Sun />
                Claro
              </button>
              <button
                className={formData.preferredTheme === 'dark' ? 'active' : ''}
                type="button"
                onClick={() => updatePreferredTheme('dark')}
              >
                <Moon />
                Escuro
              </button>
            </div>
          </section>

          <section className="profile-panel profile-consent-panel">
            <div className="profile-summary">
              <span>Termos aceitos no cadastro</span>
              <span>Política de privacidade aceita no cadastro</span>
            </div>
          </section>

          <section className="profile-save-panel">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </section>
        </div>
      </form>
    </section>
  )
}

function HelpPage({ companyName, userRole }: { companyName: string; userRole: RoleLabel }) {
  return (
    <section className="page-section">
      <PageHeader
        badge={`${companyName} · ${userRole}`}
        subtitle="Entenda a proposta do DecisionLog, os perfis de acesso e os caminhos mais importantes."
        title="Ajuda e Sobre o Sistema"
      />
      <div className="about-panel">
        <div>
          <span className="section-eyebrow">DecisionLog</span>
          <h2>Plataforma corporativa para registrar, acompanhar e auditar decisões</h2>
          <p>
            O sistema centraliza decisões organizacionais com responsáveis, departamentos,
            impacto, status e histórico de alterações. A proposta é reduzir perda de contexto,
            melhorar a prestação de contas e apoiar auditorias internas.
          </p>
        </div>
        <div className="about-metrics">
          <span>MySQL para dados estruturados</span>
          <span>MongoDB para auditoria</span>
          <span>RabbitMQ para eventos</span>
          <span>JWT, permissões e LGPD</span>
        </div>
      </div>
      <div className="help-grid">
        <article className="help-card">
          <h2>Para que serve</h2>
          <p>O DecisionLog registra decisões, contexto, motivo, impacto, status e responsáveis para preservar rastreabilidade e apoiar auditorias.</p>
        </article>
        <article className="help-card">
          <h2>Fluxo básico</h2>
          <p>Gestores e administradores registram decisões. Auditores acompanham histórico e alterações. Administradores organizam usuários, permissões e departamentos.</p>
        </article>
        <article className="help-card">
          <h2>Dicas rápidas</h2>
          <p>Use filtros por status, impacto, departamento e data para encontrar registros. A visão geral mostra indicadores rápidos, e os detalhes ficam nas telas de histórico e auditoria.</p>
        </article>
        <article className="help-card">
          <h2>Problemas comuns</h2>
          <p>Se a API parecer indisponível, um administrador pode verificar MySQL, MongoDB e eventos na tela de monitoramento. Se esquecer a senha, use a recuperação na tela de login.</p>
        </article>
      </div>
      <div className="help-grid compact">
        <article className="help-card">
          <h2>Exemplo de uso</h2>
          <p>Um gestor registra a aprovação de uma política, informa o impacto e vincula ao departamento. Depois, edições e inativações ficam rastreadas para auditoria.</p>
        </article>
        <article className="help-card">
          <h2>Perfis de acesso</h2>
          <p>Administrador gerencia usuários, departamentos e monitoramento. Gestor cria e acompanha decisões. Auditor consulta histórico e alterações sem modificar registros.</p>
        </article>
      </div>
      <div className="faq-panel">
        <div className="profile-panel-header">
          <h2>Perguntas frequentes</h2>
          <p>Situações comuns em operações reais e como agir dentro da plataforma.</p>
        </div>
        <div className="faq-grid">
          <article>
            <h3>Registrei uma decisão com informação errada. O que faço?</h3>
            <p>Use a ação de editar no histórico. A alteração fica registrada na trilha de auditoria para manter transparência.</p>
          </article>
          <article>
            <h3>Uma decisão foi concluída, mas ainda precisa ficar visível.</h3>
            <p>Altere o status para concluída. Arquive somente quando ela não exigir acompanhamento ativo, mas ainda precisar ser consultada.</p>
          </article>
          <article>
            <h3>Não encontro uma decisão antiga.</h3>
            <p>Use filtros por departamento, impacto, status e período. Decisões arquivadas continuam aparecendo no histórico.</p>
          </article>
          <article>
            <h3>O sistema mostra API com atenção.</h3>
            <p>Um administrador deve abrir Monitoramento e verificar MySQL, MongoDB e mensageria para identificar qual componente precisa de ação.</p>
          </article>
          <article>
            <h3>Um colaborador mudou de area.</h3>
            <p>O administrador deve abrir Usuários e Permissões, ver os detalhes do funcionário e atualizar o departamento vinculado.</p>
          </article>
          <article>
            <h3>Esqueci minha senha.</h3>
            <p>Na tela de login, use Esqueci minha senha. Depois informe o código recebido para cadastrar uma nova senha segura.</p>
          </article>
        </div>
      </div>
    </section>
  )
}

function Sidebar({
  canAccessAdmin,
  canAccessAudit,
  currentPage,
  isOpen,
  onClose,
  onNavigate,
  userProfile,
}: {
  canAccessAdmin: boolean
  canAccessAudit: boolean
  currentPage: Page
  isOpen: boolean
  onClose: () => void
  onNavigate: (page: Page) => void
  userProfile: { name: string; role: RoleLabel; initials: string; company: string }
}) {
  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile' as const, label: 'Meu Perfil', icon: Settings },
    ...(userProfile.role !== 'Auditor'
      ? [{ id: 'new-decision' as const, label: 'Nova Decisão', icon: FileText }]
      : []),
    { id: 'history' as const, label: 'Histórico de Decisões', icon: FolderOpen },
    ...(canAccessAudit
      ? [{ id: 'audit' as const, label: 'Trilha de Auditoria', icon: History }]
      : []),
    ...(canAccessAdmin
      ? [
          { id: 'monitoring' as const, label: 'Monitoramento', icon: Activity },
          { id: 'users' as const, label: 'Usuários e Permissões', icon: Users },
          { id: 'departments' as const, label: 'Departamentos', icon: Building2 },
        ]
      : []),
  ]

  const navLabels: Partial<Record<Page, string>> = {
    dashboard: 'Visão geral',
    history: 'Decisões',
    'new-decision': 'Nova decisão',
    audit: 'Alterações de decisões',
    monitoring: 'Monitoramento',
    departments: 'Departamentos',
    users: 'Usuários e permissões',
  }
  const navOrder: Page[] = [
    'dashboard',
    'history',
    ...(userProfile.role !== 'Auditor' ? (['new-decision'] as Page[]) : []),
    ...(canAccessAudit ? (['audit'] as Page[]) : []),
    ...(canAccessAdmin ? (['monitoring', 'departments', 'users'] as Page[]) : []),
  ]
  const visibleMenuItems = navOrder
    .map((id) => menuItems.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({ ...item, label: navLabels[item.id] || item.label }))

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-brand">
          <img src={logo} alt="DecisionLog" />
          <span>DecisionLog</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar menu">
          <X />
        </button>
      </div>
      <div className="profile-box">
        <div className="profile-avatar">
          {userProfile.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <p>{userProfile.name}</p>
          <span>{userProfile.role}</span>
          <small>{userProfile.company}</small>
        </div>
      </div>
      <nav className="sidebar-menu" aria-label="Navegação principal">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              className={isActive ? 'active' : ''}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

function PageHeader({
  actions,
  badge,
  subtitle,
  title,
}: {
  actions?: ReactNode
  badge?: string
  subtitle?: string
  title: string
}) {
  return (
    <div className="page-title-row page-header">
      <div className="page-heading">
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {(actions || badge) && (
        <div className="page-header-actions">
          {badge && <span className="profile-role">{badge}</span>}
          {actions}
        </div>
      )}
    </div>
  )
}

function Dashboard({
  decisions,
  isAdmin,
  isLoading,
  usersCount,
}: {
  decisions: DecisionView[]
  health: Health | null
  isAdmin: boolean
  isLoading: boolean
  usersCount: number
}) {
  const totalDecisions = decisions.length
  const pendingDecisions = decisions.filter((decision) => decision.status === 'Pendente').length
  const completedDecisions = decisions.filter((decision) => decision.status === 'Concluída').length
  const archivedDecisions = decisions.filter((decision) => decision.status === 'Arquivada').length
  const highImpactDecisions = decisions.filter((decision) => decision.impacto === 'Alto').length
  const completionRate = totalDecisions > 0 ? Math.round((completedDecisions / totalDecisions) * 100) : 0
  const departmentData = Object.values(
    decisions.reduce<Record<string, { name: string; decisoes: number }>>((summary, decision) => {
      summary[decision.departamento] ||= { name: decision.departamento, decisoes: 0 }
      summary[decision.departamento].decisoes += 1
      return summary
    }, {}),
  )
  const impactData = [
    { id: 'impact-1', name: 'Alto', value: decisions.filter((item) => item.impacto === 'Alto').length, color: '#DC2626' },
    { id: 'impact-2', name: 'Médio', value: decisions.filter((item) => item.impacto === 'Médio').length, color: '#F59E0B' },
    { id: 'impact-3', name: 'Baixo', value: decisions.filter((item) => item.impacto === 'Baixo').length, color: '#3B82F6' },
  ]
  const fallbackDepartmentData = departmentData.length > 0 ? departmentData : [{ name: 'Sem dados', decisoes: 0 }]
  const fallbackImpactData = impactData.some((item) => item.value > 0)
    ? impactData
    : [{ id: 'empty', name: 'Sem dados', value: 1, color: '#E5E7EB' }]

  function exportDashboardReport() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão.')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Indicadores do DecisionLog</title>
          <style>
            body { font-family: Arial, sans-serif; color: #183354; padding: 24px; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            p { color: #4b5563; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; }
            .card span { display: block; color: #6b7280; font-size: 12px; margin-bottom: 6px; }
            .card strong { font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #183354; color: #fff; }
          </style>
        </head>
        <body>
          <h1>Indicadores executivos do DecisionLog</h1>
          <p>Exportado em ${formatDateTime(new Date().toISOString())}</p>
          <div class="grid">
            <div class="card"><span>Total de decisões</span><strong>${totalDecisions}</strong></div>
            <div class="card"><span>Pendentes</span><strong>${pendingDecisions}</strong></div>
            <div class="card"><span>Concluídas</span><strong>${completedDecisions}</strong></div>
            <div class="card"><span>Arquivadas</span><strong>${archivedDecisions}</strong></div>
            <div class="card"><span>Impacto alto</span><strong>${highImpactDecisions}</strong></div>
            <div class="card"><span>Taxa de conclusão</span><strong>${completionRate}%</strong></div>
          </div>
          <h2>Volume por departamento</h2>
          <table>
            <thead><tr><th>Departamento</th><th>Decisões</th></tr></thead>
            <tbody>${departmentData.map((item) => `<tr><td>${item.name}</td><td>${item.decisoes}</td></tr>`).join('')}</tbody>
          </table>
          <h2>Distribuição por impacto</h2>
          <table>
            <thead><tr><th>Impacto</th><th>Total</th></tr></thead>
            <tbody>${impactData.map((item) => `<tr><td>${item.name}</td><td>${item.value}</td></tr>`).join('')}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <section className="page-section">
      <PageHeader
        actions={(
          <div className="toolbar-actions">
            <button type="button" onClick={exportDashboardReport}>
              <Download />
              Exportar
            </button>
          </div>
        )}
        badge="Indicadores executivos"
        subtitle="Acompanhe volume, andamento, impacto e distribuição das decisões registradas."
        title="Visão Geral Estratégica"
      />
      <div className="dashboard-guidance">
        <article>
          <span>Prioridade do dia</span>
          <strong>{pendingDecisions > 0 ? 'Resolver decisões pendentes' : 'Manter acompanhamento'}</strong>
          <p>
            {pendingDecisions > 0
              ? `${pendingDecisions} registro(s) ainda exigem análise, validação ou encaminhamento.`
              : 'Não há pendências abertas no momento. Use os gráficos para observar tendências.'}
          </p>
        </article>
        <article>
          <span>Controle executivo</span>
          <strong>{completionRate}% de conclusão</strong>
          <p>Indicador rápido para medir andamento e maturidade do processo decisório.</p>
        </article>
        <article>
          <span>Auditoria preparada</span>
          <strong>{archivedDecisions} registro(s) arquivado(s)</strong>
          <p>Decisões arquivadas continuam disponíveis para consulta e prestação de contas.</p>
        </article>
      </div>
      <div className="kpi-grid">
        <KpiCard icon={FileText} label="Total de Decisões" value={totalDecisions} tone="primary" />
        <KpiCard icon={Clock} label="Decisões Pendentes" value={pendingDecisions} tone="warning" />
        <KpiCard icon={CheckCircle2} label="Decisões Concluídas" value={completedDecisions} tone="success" />
        <KpiCard icon={AlertTriangle} label="Impacto Alto" value={highImpactDecisions} tone="danger" />
        <KpiCard icon={Building2} label="Departamentos" value={departmentData.length} tone="neutral" />
        <KpiCard icon={FolderOpen} label="Arquivadas" value={archivedDecisions} tone="neutral" />
        {isAdmin && <KpiCard icon={Users} label="Usuários Ativos" value={usersCount} tone="primary" />}
      </div>
      {isLoading && <LoadingState label="Carregando indicadores..." />}
      <div className="chart-grid">
        <article className="chart-card">
          <h3>Volume de Decisões por Departamento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fallbackDepartmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis allowDecimals={false} stroke="#6B7280" />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
              <Bar dataKey="decisoes" fill="#183354" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card">
          <h3>Distribuição por Nível de Impacto</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fallbackImpactData}
                cx="50%"
                cy="50%"
                dataKey="value"
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
                outerRadius={100}
              >
                {fallbackImpactData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileText
  label: string
  value: number
  tone: 'primary' | 'warning' | 'success' | 'danger' | 'neutral'
}) {
  return (
    <article className="kpi-card">
      <div>
        <p>{label}</p>
        <strong className={tone}>{value}</strong>
      </div>
      <div className={`kpi-icon ${tone}`}>
        <Icon />
      </div>
    </article>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="loading-panel" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

function NewDecision({
  departments,
  editingDecision,
  isSubmitting,
  onCancelEdit,
  onSave,
  userRole,
}: {
  departments: Department[]
  editingDecision: DecisionView | null
  isSubmitting: boolean
  onCancelEdit: () => void
  onSave: (decision: DecisionFormData) => Promise<void>
  userRole: RoleLabel
}) {
  const [formData, setFormData] = useState<DecisionFormData>(() =>
    editingDecision
      ? {
          titulo: editingDecision.titulo,
          departamentoId: editingDecision.departamentoId || '',
          departamento: editingDecision.departamento,
          impacto: editingDecision.impacto,
          status: editingDecision.status === 'Concluída' ? 'Concluída' : 'Pendente',
          descricao: editingDecision.descricao,
        }
      : emptyDecisionForm,
  )
  const isReadOnly = userRole === 'Auditor'
  const completionItems = [
    { label: 'Título preenchido', done: Boolean(formData.titulo.trim()) },
    { label: 'Contexto descrito', done: Boolean(formData.descricao.trim()) },
    { label: 'Departamento definido', done: Boolean(formData.departamentoId) },
    { label: 'Impacto classificado', done: Boolean(formData.impacto) },
    { label: 'Status informado', done: Boolean(formData.status) },
  ]
  const completedItems = completionItems.filter((item) => item.done).length

  function handleDepartmentChange(departmentId: string) {
    const department = departments.find((item) => item.id === departmentId)
    setFormData({
      ...formData,
      departamentoId: departmentId,
      departamento: department?.name || '',
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSave(formData)
  }

  if (isReadOnly) {
    return (
      <section className="page-section">
        <div className="empty-card">
          <p>Você não tem permissão para criar novas decisões.</p>
          <span>Apenas Administradores e Gestores podem registrar decisões.</span>
        </div>
      </section>
    )
  }

  return (
    <section className="page-section">
      <PageHeader
        badge={editingDecision ? 'Edição controlada' : 'Novo registro'}
        subtitle="Preencha somente o necessário para que a decisão fique clara, rastreável e fácil de consultar."
        title={editingDecision ? 'Editar Decisão' : 'Registrar Nova Decisão'}
      />
      <div className="form-card decision-editor-card">
        <form onSubmit={handleSubmit} className="decision-form">
          <div className="form-section-heading">
            <h2>Dados principais</h2>
            <p>Informe o contexto necessário para que a decisão seja compreendida e auditada futuramente.</p>
          </div>
          <div className="form-grid">
            <div className="full-field">
              <label htmlFor="titulo">Título da Decisão</label>
              <input
                id="titulo"
                value={formData.titulo}
                onChange={(event) => setFormData({ ...formData, titulo: event.target.value })}
                placeholder="Ex: Implementação de novo sistema de controle de estoque"
                required
              />
            </div>
            <div>
              <label htmlFor="departamento">Departamento Responsável</label>
              <select
                id="departamento"
                value={formData.departamentoId}
                onChange={(event) => handleDepartmentChange(event.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Nível de Impacto</label>
              <div className="radio-stack">
                {(['Baixo', 'Médio', 'Alto'] as const).map((impacto) => (
                  <label key={impacto}>
                    <input
                      checked={formData.impacto === impacto}
                      name="impacto"
                      onChange={(event) => setFormData({ ...formData, impacto: event.target.value as DecisionFormData['impacto'] })}
                      required
                      type="radio"
                      value={impacto}
                    />
                    <span>{impacto}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(event) => setFormData({ ...formData, status: event.target.value as DecisionFormData['status'] })}
                required
              >
                <option value="Pendente">Pendente</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>
            <div className="full-field">
              <div className="form-section-heading compact">
                <h2>Contexto e justificativa</h2>
                <p>Descreva motivo, impacto esperado e ações relacionadas à decisão.</p>
              </div>
              <label htmlFor="descricao">Descrição Detalhada</label>
              <textarea
                id="descricao"
                value={formData.descricao}
                onChange={(event) => setFormData({ ...formData, descricao: event.target.value })}
                placeholder="Descreva os detalhes da decisão, contexto, impactos esperados e ações a serem tomadas..."
                required
              />
            </div>
          </div>
          <div className="decision-progress-card">
            <div>
              <strong>Revisão antes de salvar</strong>
              <span>{completedItems} de {completionItems.length} campos obrigatórios preenchidos</span>
            </div>
            <div className="decision-progress-bar" aria-hidden="true">
              <span style={{ width: `${(completedItems / completionItems.length) * 100}%` }} />
            </div>
            <div className="decision-checklist">
              {completionItems.map((item) => (
                <span className={item.done ? 'done' : ''} key={item.label}>
                  <CheckCircle2 />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="form-actions">
            {editingDecision && (
              <button className="secondary-action" type="button" onClick={onCancelEdit}>
                Cancelar
              </button>
            )}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editingDecision ? 'Atualizar Decisão' : 'Salvar Decisão'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function DecisionHistory({
  decisions,
  currentUserId,
  userRole,
  onArchive,
  onEdit,
  onDelete,
  onView,
}: {
  decisions: DecisionView[]
  currentUserId?: string
  userRole: RoleLabel
  onArchive: (decision: DecisionView) => void
  onEdit: (decision: DecisionView) => void
  onDelete: (id: string) => void
  onView: (decision: DecisionView) => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [impactFilter, setImpactFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const canCreateOrEdit = userRole === 'Administrador' || userRole === 'Gestor'
  const departments = Array.from(new Set(decisions.map((decision) => decision.departamento))).sort()
  const hasFilters = Boolean(searchTerm || statusFilter || impactFilter || departmentFilter || dateFromFilter || dateToFilter)
  const filteredDecisions = decisions.filter(
    (decision) => {
      const decisionDate = toIsoDateFromBrazilianDate(decision.data)

      return (
        (decision.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          decision.departamento.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (!statusFilter || decision.status === statusFilter) &&
        (!impactFilter || decision.impacto === impactFilter) &&
        (!departmentFilter || decision.departamento === departmentFilter) &&
        (!dateFromFilter || decisionDate >= dateFromFilter) &&
        (!dateToFilter || decisionDate <= dateToFilter)
      )
    },
  )

  function clearFilters() {
    setSearchTerm('')
    setStatusFilter('')
    setImpactFilter('')
    setDepartmentFilter('')
    setDateFromFilter('')
    setDateToFilter('')
  }

  function exportCsv() {
    const headers = ['ID', 'Título', 'Departamento', 'Impacto', 'Status', 'Data', 'Autor']
    const rows = filteredDecisions.map((decision) => [
      decision.id,
      decision.titulo,
      decision.departamento,
      decision.impacto,
      decision.status,
      decision.data,
      decision.autor,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'historico-decisoes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão.')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Histórico de Decisões</title>
          <style>
            body { font-family: Arial, sans-serif; color: #183354; padding: 24px; }
            h1 { font-size: 22px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #183354; color: #fff; }
          </style>
        </head>
        <body>
          <h1>Histórico de Decisões</h1>
          <p>Exportado em ${formatDateTime(new Date().toISOString())}</p>
          <table>
            <thead><tr><th>ID</th><th>Título</th><th>Departamento</th><th>Impacto</th><th>Status</th><th>Data</th><th>Autor</th></tr></thead>
            <tbody>
              ${filteredDecisions.map((decision) => `
                <tr>
                  <td>${decision.id}</td>
                  <td>${decision.titulo}</td>
                  <td>${decision.departamento}</td>
                  <td>${decision.impacto}</td>
                  <td>${decision.status}</td>
                  <td>${decision.data}</td>
                  <td>${decision.autor}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <section className="page-section">
      <PageHeader
        actions={(
          <div className="toolbar-actions">
            <button type="button" onClick={() => setIsExportModalOpen(true)}>
              <Download />
              Exportar
            </button>
          </div>
        )}
        subtitle="Consulte, filtre, visualize detalhes e exporte registros para análise ou prestação de contas."
        title="Histórico de Decisões"
      />
      {isExportModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card export-modal">
            <div className="modal-header">
              <h2>Exportar histórico</h2>
              <button type="button" onClick={() => setIsExportModalOpen(false)}>
                <X />
              </button>
            </div>
            <div className="export-options">
              <button type="button" onClick={() => { exportCsv(); setIsExportModalOpen(false) }}>
                <FileText />
                <span>
                  <strong>Arquivo CSV</strong>
                  <small>Planilha com os registros filtrados para análise externa.</small>
                </span>
              </button>
              <button type="button" onClick={() => { exportPdf(); setIsExportModalOpen(false) }}>
                <Download />
                <span>
                  <strong>Relatório PDF</strong>
                  <small>Abre a impressão do navegador com a tabela atual.</small>
                </span>
              </button>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setIsExportModalOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="filters-card">
        <div className="filters-card-header">
          <div>
            <strong>Localizar registros</strong>
            <span>{filteredDecisions.length} de {decisions.length} decisões exibidas</span>
          </div>
          {hasFilters && <span className="filter-status">Filtros aplicados</span>}
        </div>
        <div className="search-wrap">
          <Search />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar decisão..."
            type="text"
          />
        </div>
        <div className="filter-grid">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos os status</option>
            <option value="Pendente">Pendente</option>
            <option value="Concluída">Concluída</option>
            <option value="Arquivada">Arquivada</option>
            <option value="Inativa">Inativa</option>
          </select>
          <select value={impactFilter} onChange={(event) => setImpactFilter(event.target.value)}>
            <option value="">Todos os impactos</option>
            <option value="Baixo">Baixo</option>
            <option value="Médio">Médio</option>
            <option value="Alto">Alto</option>
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="">Todos os departamentos</option>
            {departments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
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
      <DataTable>
        <thead>
          <tr>
            <th>ID</th>
            <th>Título</th>
            <th>Departamento</th>
            <th>Impacto</th>
            <th>Status</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredDecisions.length === 0 ? (
            <tr>
              <td colSpan={7}>Nenhuma decisão encontrada</td>
            </tr>
          ) : (
            filteredDecisions.map((decision) => (
              <tr key={decision.id}>
                <td>#{decision.id.slice(0, 8)}</td>
                <td>{decision.titulo}</td>
                <td>{decision.departamento}</td>
                <td>
                  <span className={`tag impact-${decision.impacto.toLowerCase()}`}>{decision.impacto}</span>
                </td>
                <td>
                  <span className={`tag status-${decision.status.toLowerCase()}`}>{decision.status}</span>
                </td>
                <td>{decision.data}</td>
                <td>
                  <div className="action-row">
                    <button type="button" onClick={() => onView(decision)} title="Visualizar">
                      <Eye />
                    </button>
                    {canCreateOrEdit && (
                      <>
                        {(userRole === 'Administrador' || decision.source.user?.id === currentUserId) && (
                          <button className="gold" type="button" onClick={() => onEdit(decision)} title="Editar">
                            <Edit2 />
                          </button>
                        )}
                        {decision.status !== 'Inativa' && (
                          <button
                            className="gold"
                            type="button"
                            onClick={() => onArchive(decision)}
                            title={decision.status === 'Arquivada' ? 'Desarquivar decisão' : 'Arquivar decisão'}
                          >
                            <FolderOpen />
                          </button>
                        )}
                        {(userRole === 'Administrador' || decision.source.user?.id === currentUserId) && (
                          <button className="danger" type="button" onClick={() => onDelete(decision.id)} title="Inativar">
                            <Trash2 />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </section>
  )
}

function UsersPage({
  currentUserId,
  departments,
  onDelete,
  onUpdate,
  users,
}: {
  currentUserId?: string
  departments: Department[]
  onDelete: (userId: string) => void
  onUpdate: (userId: string, data: Partial<Pick<User, 'role' | 'active' | 'departmentId'>>) => void
  users: User[]
}) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const activeUsers = users.filter((item) => item.active).length
  const admins = users.filter((item) => item.role === 'admin').length
  const unassignedUsers = users.filter((item) => !item.departmentId).length

  return (
    <section className="page-section">
      <PageHeader
        badge="Administração"
        subtitle="Gerencie perfis, departamentos, status de acesso e dados de contato dos colaboradores."
        title="Usuários e Permissões"
      />
      <div className="admin-summary-grid">
        <article>
          <span>Usuários ativos</span>
          <strong>{activeUsers}</strong>
        </article>
        <article>
          <span>Administradores</span>
          <strong>{admins}</strong>
        </article>
        <article>
          <span>Sem departamento</span>
          <strong>{unassignedUsers}</strong>
        </article>
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Entrada</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>
                <span className="tag status-pendente">{roleLabels[item.role]}</span>
              </td>
              <td>
                <span className={`tag ${item.active ? 'status-concluída' : 'status-inativa'}`}>
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td>{formatDateTime(item.createdAt)}</td>
              <td>
                <div className="action-row">
                  <button type="button" onClick={() => setSelectedUser(item)} title="Ver detalhes">
                    <Eye />
                  </button>
                  <button
                    className={item.active ? 'danger' : 'gold'}
                    disabled={item.id === currentUserId}
                    type="button"
                    onClick={() => onUpdate(item.id, { active: !item.active })}
                    title={item.active ? 'Desativar' : 'Ativar'}
                  >
                    <UserIcon />
                  </button>
                  <button
                    className="danger"
                    disabled={item.id === currentUserId}
                    type="button"
                    onClick={() => onDelete(item.id)}
                    title="Excluir"
                  >
                    <Trash2 />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {selectedUser && (
        <UserDetailsModal
          departments={departments}
          onClose={() => setSelectedUser(null)}
          onUpdate={onUpdate}
          user={selectedUser}
        />
      )}
    </section>
  )
}

function UserDetailsModal({
  departments,
  onClose,
  onUpdate,
  user,
}: {
  departments: Department[]
  onClose: () => void
  onUpdate: (userId: string, data: Partial<Pick<User, 'role' | 'active' | 'departmentId'>>) => void
  user: User
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card user-modal">
        <div className="modal-header">
          <h2>Detalhes do funcionário</h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-content">
          <div className="user-detail-header">
            <div className="profile-avatar large">{getInitials(user.name)}</div>
            <div>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </div>
          </div>
          <div className="detail-grid">
            <Detail label="Contato" value={user.phone || 'Não informado'} />
            <Detail label="Departamento" value={user.department?.name || 'Não vinculado'} />
            <Detail label="Data de entrada" value={formatDateTime(user.createdAt)} />
            <Detail label="Status" value={user.active ? 'Ativo' : 'Inativo'} />
          </div>
          <div className="form-grid user-admin-grid">
            <div>
              <label>Perfil</label>
              <select
                className="table-select"
                value={roleLabels[user.role]}
                onChange={(event) => onUpdate(user.id, { role: labelToRole[event.target.value as RoleLabel] })}
              >
                <option>Administrador</option>
                <option>Gestor</option>
                <option>Auditor</option>
              </select>
            </div>
            <div>
              <label>Departamento</label>
              <select
                className="table-select"
                value={user.departmentId || ''}
                onChange={(event) => onUpdate(user.id, { departmentId: event.target.value || null })}
              >
                <option value="">Não vinculado</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DepartmentsPage({
  departments,
  onCreate,
  onDelete,
  onRename,
  onToggle,
}: {
  departments: Department[]
  onCreate: (name: string) => void
  onDelete: (department: Department) => void
  onRename: (department: Department, name: string) => void
  onToggle: (department: Department) => void
}) {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')
  const activeDepartments = departments.filter((department) => department.active).length
  const inactiveDepartments = departments.length - activeDepartments
  const linkedUsers = departments.reduce((total, department) => total + (department.userCount ?? department._count?.users ?? 0), 0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onCreate(name)
    setName('')
  }

  return (
    <section className="page-section">
      <PageHeader
        badge="Estrutura organizacional"
        subtitle="Organize áreas internas e acompanhe quantos usuários e decisões pertencem a cada departamento."
        title="Departamentos"
      />
      <div className="admin-summary-grid">
        <article>
          <span>Departamentos ativos</span>
          <strong>{activeDepartments}</strong>
        </article>
        <article>
          <span>Inativos</span>
          <strong>{inactiveDepartments}</strong>
        </article>
        <article>
          <span>Usuários vinculados</span>
          <strong>{linkedUsers}</strong>
        </article>
      </div>
      <div className="filters-card">
        <form className="compact-form" onSubmit={handleSubmit}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Novo departamento"
            required
          />
          <button type="submit">Adicionar</button>
        </form>
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuários</th>
            <th>Decisões</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.id}>
              <td>
                {editingId === department.id ? (
                  <input
                    className="table-input"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                ) : (
                  department.name
                )}
              </td>
              <td>{department.userCount ?? department._count?.users ?? 0}</td>
              <td>{department.decisionCount ?? department._count?.decisions ?? 0}</td>
              <td>
                <span className={`tag ${department.active ? 'status-concluída' : 'status-inativa'}`}>
                  {department.active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td>
                <div className="action-row">
                  {editingId === department.id ? (
                    <>
                      <button
                        className="gold"
                        type="button"
                        onClick={() => {
                          onRename(department, editingName)
                          setEditingId('')
                        }}
                        title="Salvar nome"
                      >
                        <CheckCircle2 />
                      </button>
                      <button type="button" onClick={() => setEditingId('')} title="Cancelar edição">
                        <X />
                      </button>
                    </>
                  ) : (
                    <button
                      className="gold"
                      type="button"
                      onClick={() => {
                        setEditingId(department.id)
                        setEditingName(department.name)
                      }}
                      title="Renomear"
                    >
                      <Edit2 />
                    </button>
                  )}
                  <button className={department.active ? 'danger' : 'gold'} type="button" onClick={() => onToggle(department)} title={department.active ? 'Inativar' : 'Ativar'}>
                    <UserIcon />
                  </button>
                  <button className="danger" type="button" onClick={() => onDelete(department)} title="Excluir">
                    <Trash2 />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </section>
  )
}

function AuditTrail({ events }: { events: AuditLog[] }) {
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
  const archivedEvents = decisionEvents.filter((event) => event.action === 'DECISION_ARCHIVED' || event.action === 'DECISION_UNARCHIVED').length

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
          <span>O MongoDB ainda não retornou logs reais nesta sessão; os eventos abaixo simulam como a auditoria aparece quando decisões são criadas, editadas ou arquivadas.</span>
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

function MonitoringPage({
  auditLogs,
  health,
  token,
}: {
  auditLogs: AuditLog[]
  health: Health | null
  token: string
}) {
  const [liveHealth, setLiveHealth] = useState<Health | null>(health)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [responseMs, setResponseMs] = useState<number | null>(null)
  const recentEventCount = auditLogs.length
  const currentHealth = liveHealth || health
  const checks = currentHealth?.checks
  const unhealthyServices = [
    checks?.mysql !== 'ok' ? 'MySQL' : '',
    checks?.mongodb !== 'ok' ? 'MongoDB' : '',
    checks?.events.state && checks.events.state !== 'closed' ? 'Mensageria' : '',
  ].filter(Boolean)
  const operationalMessage = !currentHealth
    ? 'Aguardando leitura do health check.'
    : unhealthyServices.length === 0
      ? 'Todos os componentes essenciais responderam sem alerta.'
      : `Atenção em: ${unhealthyServices.join(', ')}.`
  const eventState = checks?.events.state || 'unknown'
  const eventFailureCount = checks?.events.failureCount ?? 0

  const refreshHealth = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const startedAt = performance.now()
      const response = await fetch(`${apiUrl}/health`, {
        headers: token ? authHeaders(token) : undefined,
      })
      const payload = (await response.json()) as Health
      setResponseMs(Math.round(performance.now() - startedAt))
      setLiveHealth(payload)
      setLastCheckedAt(new Date())
      if (!response.ok) {
        toast.warning('Health check respondeu com alerta. Veja os detalhes do monitoramento.')
      }
    } catch {
      toast.error('Não foi possível atualizar o monitoramento.')
    } finally {
      setIsRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    window.setTimeout(() => {
      void refreshHealth()
    }, 0)
    const interval = window.setInterval(() => {
      void refreshHealth()
    }, 15_000)

    return () => window.clearInterval(interval)
  }, [refreshHealth])

  return (
    <section className="page-section">
      <PageHeader
        actions={(
          <div className="toolbar-actions">
            <span className={`health-pill ${currentHealth?.status === 'ok' ? 'ok' : 'degraded'}`}>
              <Activity />
              API {currentHealth?.status === 'ok' ? 'saudável' : 'com atenção'}
            </span>
            <button type="button" onClick={refreshHealth} disabled={isRefreshing}>
              <RotateCcw />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        )}
        subtitle="Painel técnico para administradores acompanharem API, bancos, mensageria e logs recentes."
        title="Monitoramento do Sistema"
      />
      <div className="monitor-summary">
        <div>
          <strong>Estado atual</strong>
          <p>{operationalMessage}</p>
        </div>
        <div>
          <span>Última leitura: {lastCheckedAt ? formatDateTime(lastCheckedAt.toISOString()) : 'aguardando primeira leitura'}</span>
          <span>Tempo de resposta: {responseMs !== null ? `${responseMs} ms` : 'não medido'}</span>
          <span>Atualização automática: 15s</span>
        </div>
      </div>
      <div className="monitor-grid monitor-grid-operational">
        <article className={`monitor-card ${currentHealth?.status === 'ok' ? 'ok' : 'attention'}`}>
          <span>API REST</span>
          <strong>{currentHealth?.service || 'DecisionLog API'}</strong>
          <p>Status HTTP: {currentHealth?.status || 'sem leitura'} | Endpoint: /health</p>
        </article>
        <article className={`monitor-card ${checks?.mysql === 'ok' ? 'ok' : 'attention'}`}>
          <span>Banco relacional</span>
          <strong>MySQL {checks?.mysql || 'unknown'}</strong>
          <p>Login, usuários, departamentos, decisões e permissões dependem deste serviço.</p>
        </article>
        <article className={`monitor-card ${checks?.mongodb === 'ok' ? 'ok' : 'attention'}`}>
          <span>Auditoria NoSQL</span>
          <strong>MongoDB {checks?.mongodb || 'unknown'}</strong>
          <p>Responsável pelos logs flexíveis de auditoria e alterações importantes.</p>
        </article>
        <article className={`monitor-card ${eventState === 'closed' ? 'ok' : 'attention'}`}>
          <span>Mensageria e circuit breaker</span>
          <strong>{checks?.events.mode || 'memory'} / {eventState}</strong>
          <p>{eventFailureCount} falha(s) consecutiva(s) | {checks?.events.publishedEvents || 0} evento(s) publicados.</p>
        </article>
      </div>
      <div className="monitor-operations">
        <article>
          <h3>Checklist operacional</h3>
          <div className="operation-list">
            <span className={currentHealth?.status === 'ok' ? 'ok' : 'attention'}>API: {currentHealth ? 'endpoint respondeu' : 'sem resposta registrada'}</span>
            <span className={checks?.mysql === 'ok' ? 'ok' : 'attention'}>MySQL: {checks?.mysql === 'ok' ? 'persistência principal disponível' : 'verificar serviço, credenciais ou DATABASE_URL'}</span>
            <span className={checks?.mongodb === 'ok' ? 'ok' : 'attention'}>MongoDB: {checks?.mongodb === 'ok' ? 'auditoria disponível' : 'logs podem não ser gravados'}</span>
            <span className={eventState === 'closed' ? 'ok' : 'attention'}>Eventos: {eventState === 'closed' ? 'circuit breaker fechado' : `circuit breaker em estado ${eventState}`}</span>
          </div>
        </article>
        <article>
          <h3>Ações para apresentação</h3>
          <ul>
            <li>Antes de demonstrar, clique em Atualizar e confirme se API e MySQL responderam.</li>
            <li>Se MongoDB estiver em alerta, explique que o sistema principal continua e a auditoria fica limitada.</li>
            <li>Se eventos estiverem em alerta, valide o RabbitMQ ou use o modo em memória para demonstração local.</li>
          </ul>
        </article>
      </div>
      <div className="technical-grid">
        <article>
          <h3>Leitura bruta do /health</h3>
          <pre>{JSON.stringify(currentHealth, null, 2)}</pre>
        </article>
        <article>
          <h3>Interpretação operacional</h3>
          <ul>
            <li>API responde quando o endpoint retorna status `ok`.</li>
            <li>MySQL precisa estar `ok` para autenticação, usuários, departamentos e decisões.</li>
            <li>MongoDB precisa estar `ok` para trilhas de auditoria.</li>
            <li>Circuit breaker `closed` indica que a mensageria está liberada.</li>
            <li>Falhas consecutivas aumentam `failureCount`; em limite crítico, o circuito abre.</li>
            <li>Eventos de auditoria carregados no painel: {recentEventCount}.</li>
          </ul>
        </article>
      </div>
    </section>
  )
}

function AppFooter({ health }: { health: Health | null }) {
  return (
    <footer className="app-footer">
      <div>
        <strong>DecisionLog</strong>
        <span>Ambiente local de desenvolvimento</span>
      </div>
      <div>
        <span>API {health?.status === 'ok' ? 'operacional' : 'verificando'}</span>
        <span>v0.1 MVP acadêmico</span>
      </div>
    </footer>
  )
}

function AuditList({
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

function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="table-card">
      <div className="table-scroll">
        <table>{children}</table>
      </div>
    </div>
  )
}

function ViewDecisionModal({
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
    <div className="modal-backdrop">
      <div className="modal-card">
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

export default App
