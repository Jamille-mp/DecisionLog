import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
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

type Page = 'dashboard' | 'new-decision' | 'history' | 'audit' | 'users' | 'departments' | 'profile' | 'help'
type ApiRole = 'admin' | 'manager' | 'auditor'
type RoleLabel = 'Administrador' | 'Gestor' | 'Auditor'
type ApiStatus = 'pending' | 'approved' | 'archived' | 'inactive'
type ApiImpact = 'low' | 'medium' | 'high'

type User = {
  id: string
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
}

type Health = {
  status: string
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
  name: string
  email: string
  password: string
  acceptedTerms: boolean
  acceptedPrivacy: boolean
  resetToken: string
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333'

const emptyAuthForm: AuthForm = {
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

const labelToRole: Record<RoleLabel, ApiRole> = {
  Administrador: 'admin',
  Gestor: 'manager',
  Auditor: 'auditor',
}

const actionLabels: Record<string, string> = {
  USER_REGISTERED: 'Usuário cadastrado',
  USER_LOGGED_IN: 'Login realizado',
  USER_UPDATED: 'Usuário atualizado',
  DEPARTMENT_CREATED: 'Departamento criado',
  DEPARTMENT_UPDATED: 'Departamento atualizado',
  DECISIONS_VIEWED: 'Decisões visualizadas',
  DECISION_CREATED: 'Decisão criada',
  DECISION_UPDATED: 'Decisão editada',
  DECISION_DELETED: 'Decisão inativada',
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
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
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

  const canAccessAudit = user?.role === 'admin' || user?.role === 'auditor'
  const isAdmin = user?.role === 'admin'
  const userProfile = {
    name: user?.name || 'Usuário',
    role: roleLabels[user?.role || 'manager'],
    initials: (user?.name || 'Usuário')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase(),
  }

  const decisionViews = useMemo(() => decisions.map(toDecisionView), [decisions])

  useEffect(() => {
    document.body.dataset.theme = user?.preferredTheme || 'light'
  }, [user?.preferredTheme])

  useEffect(() => {
    if (!token || !user) return

    let isCurrent = true

    async function loadInitialData() {
      setIsLoading(true)
      try {
        const requests = [
          fetch(`${apiUrl}/decisions`, { headers: authHeaders(token) }),
          fetch(`${apiUrl}/departments`, { headers: authHeaders(token) }),
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
    const response = await fetch(`${apiUrl}/departments`, {
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

      const endpoint = authMode === 'login' ? 'login' : 'register'
      const body =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
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

      if (authMode === 'register') {
        toast.success('Usuário cadastrado. Faça login para continuar.')
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
    setDecisions([])
    setDepartments([])
    setUsers([])
    setAuditLogs([])
    setDecisionAuditLogs([])
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

    if ((page === 'users' || page === 'departments') && !isAdmin) {
      toast.error('Apenas administradores acessam esta área.')
      return
    }

    setCurrentPage(page)
    setIsSidebarOpen(false)
    setIsProfileMenuOpen(false)
  }

  function openDecision(decision: DecisionView) {
    setSelectedDecision(decision)
    setDecisionAuditLogs([])
  }

  function openProfile() {
    setCurrentPage('profile')
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
            onCancelEdit={() => setEditingDecision(null)}
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
              setCurrentPage('new-decision')
            }}
            onDelete={handleDeleteDecision}
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
            onUpdate={handleUpdateUser}
            users={users}
          />
        )
      case 'departments':
        return (
          <DepartmentsPage
            departments={departments}
            onCreate={handleCreateDepartment}
            onToggle={handleToggleDepartment}
          />
        )
      case 'profile':
        return user ? (
          <ProfilePage isSubmitting={isSubmitting} onSave={handleUpdateProfile} user={user} />
        ) : null
      case 'help':
        return <HelpPage userRole={userProfile.role} />
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
          onSubmit={handleAuthSubmit}
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
        <div className="topbar-brand">
          <img src={logo} alt="DecisionLog" />
          <button className="brand-button" type="button" onClick={() => navigateTo('dashboard')}>
            <strong>DecisionLog</strong>
            <span>Governança de decisões</span>
          </button>
        </div>
        <div className="profile-menu-wrap">
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
                <span>{userProfile.role}</span>
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
      <main className="content-area">{renderContent()}</main>
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
  onSubmit,
}: {
  authForm: AuthForm
  authMode: AuthMode
  isSubmitting: boolean
  onChange: (form: AuthForm) => void
  onOpenLegal: (type: 'terms' | 'privacy') => void
  onModeChange: (mode: AuthMode) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-wrap">
          <img src={logo} alt="DecisionLog" />
        </div>
        <h2>Sistema de Gestão de Capital Intelectual</h2>
        <form onSubmit={onSubmit} className="login-form">
          {authMode === 'register' && (
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
              <input
                id="password"
                type="password"
                value={authForm.password}
                onChange={(event) => onChange({ ...authForm, password: event.target.value })}
                placeholder="********"
                required
              />
            </div>
          )}
          {authMode === 'register' && (
            <div className="consent-box">
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
                  : authMode === 'forgot'
                    ? 'Enviar instruções'
                    : 'Redefinir senha'}
          </button>
        </form>
        {authMode === 'login' && (
          <button className="mode-button subtle" type="button" onClick={() => onModeChange('forgot')}>
            Esqueci minha senha
          </button>
        )}
        <button
          className="mode-button"
          type="button"
          onClick={() => onModeChange(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? 'Criar uma conta' : 'Já tenho uma conta'}
        </button>
        <p>Plataforma de Governança Corporativa</p>
      </div>
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSave(formData)
    setFormData((current) => ({
      ...current,
      currentPassword: '',
      newPassword: '',
    }))
  }

  return (
    <section className="page-section">
      <div className="page-title-row">
        <h1>Meu Perfil</h1>
        <span className="profile-role">{roleLabels[user.role]}</span>
      </div>
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
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  placeholder="Telefone ou WhatsApp"
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
                <input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(event) => setFormData({ ...formData, currentPassword: event.target.value })}
                  placeholder="Senha usada atualmente"
                />
              </div>
              <div>
                <label htmlFor="newPassword">Nova senha</label>
                <input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(event) => setFormData({ ...formData, newPassword: event.target.value })}
                  placeholder="Mínimo de 6 caracteres"
                />
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
                onClick={() => setFormData({ ...formData, preferredTheme: 'light' })}
              >
                <Sun />
                Claro
              </button>
              <button
                className={formData.preferredTheme === 'dark' ? 'active' : ''}
                type="button"
                onClick={() => setFormData({ ...formData, preferredTheme: 'dark' })}
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
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </section>
        </div>
      </form>
    </section>
  )
}

function HelpPage({ userRole }: { userRole: RoleLabel }) {
  return (
    <section className="page-section">
      <div className="page-title-row">
        <h1>Ajuda e Sobre o Sistema</h1>
        <span className="profile-role">{userRole}</span>
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
          <p>Se a API parecer indisponível, um administrador pode verificar MySQL, MongoDB e eventos no painel da visão geral. Se esquecer a senha, use a recuperação na tela de login.</p>
        </article>
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
  userProfile: { name: string; role: RoleLabel; initials: string }
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
    departments: 'Departamentos',
    users: 'Usuários e permissões',
  }
  const navOrder: Page[] = [
    'dashboard',
    'history',
    ...(userProfile.role !== 'Auditor' ? (['new-decision'] as Page[]) : []),
    ...(canAccessAudit ? (['audit'] as Page[]) : []),
    ...(canAccessAdmin ? (['departments', 'users'] as Page[]) : []),
  ]
  const visibleMenuItems = navOrder
    .map((id) => menuItems.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({ ...item, label: navLabels[item.id] || item.label }))

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <img src={logo} alt="DecisionLog" />
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

function Dashboard({
  decisions,
  health,
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

  return (
    <section className="page-section">
      <div className="page-title-row">
        <h1>Visão Geral Estratégica</h1>
        {isAdmin && health && (
          <div className={`health-pill ${health.status}`}>
            <Activity />
            API {health.status === 'ok' ? 'saudável' : 'degradada'}
          </div>
        )}
      </div>
      <div className="kpi-grid">
        <KpiCard icon={FileText} label="Total de Decisões" value={totalDecisions} tone="primary" />
        <KpiCard icon={Clock} label="Decisões Pendentes" value={pendingDecisions} tone="warning" />
        <KpiCard icon={CheckCircle2} label="Decisões Concluídas" value={completedDecisions} tone="success" />
        {isAdmin && <KpiCard icon={Users} label="Usuários Ativos" value={usersCount} tone="primary" />}
      </div>
      {isAdmin && health && (
        <div className="health-grid">
          <span>MySQL: {health.checks.mysql}</span>
          <span>MongoDB: {health.checks.mongodb}</span>
          <span>Eventos: {health.checks.events.state}</span>
        </div>
      )}
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
  tone: 'primary' | 'warning' | 'success'
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
      <h1>{editingDecision ? 'Editar Decisão' : 'Registrar Nova Decisão'}</h1>
      <div className="form-card">
        <form onSubmit={handleSubmit} className="decision-form">
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
  onEdit,
  onDelete,
  onView,
}: {
  decisions: DecisionView[]
  currentUserId?: string
  userRole: RoleLabel
  onEdit: (decision: DecisionView) => void
  onDelete: (id: string) => void
  onView: (decision: DecisionView) => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [impactFilter, setImpactFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const canCreateOrEdit = userRole === 'Administrador' || userRole === 'Gestor'
  const departments = Array.from(new Set(decisions.map((decision) => decision.departamento))).sort()
  const filteredDecisions = decisions.filter(
    (decision) =>
      (decision.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        decision.departamento.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!statusFilter || decision.status === statusFilter) &&
      (!impactFilter || decision.impacto === impactFilter) &&
      (!departmentFilter || decision.departamento === departmentFilter) &&
      (!dateFilter || decision.data === new Intl.DateTimeFormat('pt-BR').format(new Date(`${dateFilter}T00:00:00`))),
  )

  return (
    <section className="page-section">
      <h1>Histórico de Decisões</h1>
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
        <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
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
  onUpdate,
  users,
}: {
  currentUserId?: string
  departments: Department[]
  onUpdate: (userId: string, data: Partial<Pick<User, 'role' | 'active' | 'departmentId'>>) => void
  users: User[]
}) {
  return (
    <section className="page-section">
      <h1>Usuários e Permissões</h1>
      <DataTable>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Contato</th>
            <th>Departamento</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.email}</td>
              <td>{item.phone || 'Não informado'}</td>
              <td>
                <select
                  className="table-select"
                  value={item.departmentId || ''}
                  onChange={(event) =>
                    onUpdate(item.id, { departmentId: event.target.value || null })
                  }
                >
                  <option value="">Não vinculado</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  className="table-select"
                  value={roleLabels[item.role]}
                  onChange={(event) =>
                    onUpdate(item.id, { role: labelToRole[event.target.value as RoleLabel] })
                  }
                >
                  <option>Administrador</option>
                  <option>Gestor</option>
                  <option>Auditor</option>
                </select>
              </td>
              <td>
                <span className={`tag ${item.active ? 'status-concluída' : 'status-inativa'}`}>
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td>
                <button
                  className="inline-action"
                  disabled={item.id === currentUserId}
                  type="button"
                  onClick={() => onUpdate(item.id, { active: !item.active })}
                >
                  {item.active ? 'Inativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </section>
  )
}

function DepartmentsPage({
  departments,
  onCreate,
  onToggle,
}: {
  departments: Department[]
  onCreate: (name: string) => void
  onToggle: (department: Department) => void
}) {
  const [name, setName] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onCreate(name)
    setName('')
  }

  return (
    <section className="page-section">
      <h1>Departamentos</h1>
      <form className="compact-form" onSubmit={handleSubmit}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Novo departamento"
          required
        />
        <button type="submit">Adicionar</button>
      </form>
      <DataTable>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.id}>
              <td>{department.name}</td>
              <td>
                <span className={`tag ${department.active ? 'status-concluída' : 'status-inativa'}`}>
                  {department.active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td>
                <button className="inline-action" type="button" onClick={() => onToggle(department)}>
                  {department.active ? 'Inativar' : 'Ativar'}
                </button>
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
  const [dateFilter, setDateFilter] = useState('')
  const decisionEvents = events.filter((event) => {
    if (!event.action.startsWith('DECISION_')) return false
    if (actionFilter && event.action !== actionFilter) return false
    if (dateFilter && new Date(event.timestamp).toISOString().slice(0, 10) !== dateFilter) return false
    return true
  })
  return (
    <section className="page-section">
      <h1>Histórico de alterações nas decisões</h1>
      <div className="filter-grid">
        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
          <option value="">Todas as alterações</option>
          <option value="DECISION_CREATED">Criação</option>
          <option value="DECISION_UPDATED">Edição</option>
          <option value="DECISION_DELETED">Inativação</option>
        </select>
        <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
      </div>
      <AuditList events={decisionEvents} emptyMessage="Nenhuma alteração de decisão registrada" />
    </section>
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
