import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Search,
  Trash2,
  User as UserIcon,
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

type Page = 'dashboard' | 'new-decision' | 'history' | 'audit'
type ApiRole = 'admin' | 'manager' | 'auditor'
type RoleLabel = 'Administrador' | 'Gestor' | 'Auditor'
type ApiStatus = 'pending' | 'approved' | 'archived' | 'inactive'
type ApiImpact = 'low' | 'medium' | 'high'

type User = {
  id: string
  name: string
  email: string
  role: ApiRole
}

type ApiDecision = {
  id: string
  title: string
  context: string
  decision: string
  reason: string
  department: string
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
  departamento: string
  impacto: 'Baixo' | 'Médio' | 'Alto' | ''
  status: 'Pendente' | 'Concluída'
  descricao: string
}

type AuthForm = {
  name: string
  email: string
  password: string
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333'

const emptyAuthForm: AuthForm = {
  name: '',
  email: '',
  password: '',
}

const emptyDecisionForm: DecisionFormData = {
  titulo: '',
  departamento: '',
  impacto: '',
  status: 'Pendente',
  descricao: '',
}

const roleLabels: Record<ApiRole, RoleLabel> = {
  admin: 'Administrador',
  manager: 'Gestor',
  auditor: 'Auditor',
}

const actionLabels: Record<string, string> = {
  USER_REGISTERED: 'Usuário cadastrado',
  USER_LOGGED_IN: 'Login realizado',
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
    departamento: decision.department,
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
    impact: impactToApi[form.impacto || 'Médio'],
    status: statusToApi[form.status],
  }
}

function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuthForm)
  const [token, setToken] = useState(() => localStorage.getItem('decisionlog:token') || '')
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('decisionlog:user')
    return storedUser ? (JSON.parse(storedUser) as User) : null
  })
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [decisions, setDecisions] = useState<ApiDecision[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [selectedDecision, setSelectedDecision] = useState<DecisionView | null>(null)
  const [editingDecision, setEditingDecision] = useState<DecisionView | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canAccessAudit = user?.role === 'admin' || user?.role === 'auditor'
  const userProfile = {
    name: user?.name || 'Usuário',
    role: roleLabels[user?.role || 'manager'],
  }

  const decisionViews = useMemo(() => decisions.map(toDecisionView), [decisions])

  useEffect(() => {
    if (!token || !user) return

    let isCurrent = true

    async function loadInitialData() {
      setIsLoading(true)
      try {
        const decisionResponse = await fetch(`${apiUrl}/decisions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!decisionResponse.ok) {
          throw new Error('Não foi possível carregar as decisões.')
        }

        const loadedDecisions = (await decisionResponse.json()) as ApiDecision[]
        let loadedAuditLogs: AuditLog[] = []

        if (canAccessAudit) {
          const auditResponse = await fetch(`${apiUrl}/audit-logs`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (!auditResponse.ok) {
            throw new Error('Não foi possível carregar a auditoria.')
          }

          loadedAuditLogs = (await auditResponse.json()) as AuditLog[]
        }

        if (isCurrent) {
          setDecisions(loadedDecisions)
          setAuditLogs(loadedAuditLogs)
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
  }, [token, user, canAccessAudit])

  async function refreshAuditLogs(currentToken = token) {
    if (!currentToken || !canAccessAudit) return

    const response = await fetch(`${apiUrl}/audit-logs`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })

    if (response.ok) {
      setAuditLogs((await response.json()) as AuditLog[])
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const endpoint = authMode === 'login' ? 'login' : 'register'
      const body =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authForm

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
        setAuthForm((current) => ({ ...current, password: '' }))
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
    setAuditLogs([])
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
            Authorization: `Bearer ${token}`,
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

  function handleEditDecision(decision: DecisionView) {
    setEditingDecision(decision)
    setCurrentPage('new-decision')
  }

  async function handleDeleteDecision(id: string) {
    const confirmed = window.confirm('Deseja realmente inativar esta decisão?')
    if (!confirmed) return

    try {
      const response = await fetch(`${apiUrl}/decisions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  function navigateTo(page: Page) {
    if (page === 'audit' && !canAccessAudit) {
      toast.error('Apenas administradores e auditores acessam a auditoria.')
      return
    }

    setCurrentPage(page)
  }

  function renderContent() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard decisions={decisionViews} isLoading={isLoading} />
      case 'new-decision':
        return (
          <NewDecision
            key={editingDecision?.id || 'new'}
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
            onEdit={handleEditDecision}
            onDelete={handleDeleteDecision}
            onView={setSelectedDecision}
          />
        )
      case 'audit':
        return <AuditTrail events={auditLogs} />
      default:
        return <Dashboard decisions={decisionViews} isLoading={isLoading} />
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
          onModeChange={setAuthMode}
          onSubmit={handleAuthSubmit}
        />
      </>
    )
  }

  return (
    <div className="app-frame">
      <Toaster richColors position="top-right" />
      <Sidebar
        canAccessAudit={canAccessAudit}
        currentPage={currentPage}
        onLogout={handleLogout}
        onNavigate={navigateTo}
        userProfile={userProfile}
      />
      <main className="content-area">{renderContent()}</main>
      <ViewDecisionModal decision={selectedDecision} onClose={() => setSelectedDecision(null)} />
    </div>
  )
}

function Login({
  authForm,
  authMode,
  isSubmitting,
  onChange,
  onModeChange,
  onSubmit,
}: {
  authForm: AuthForm
  authMode: 'login' | 'register'
  isSubmitting: boolean
  onChange: (form: AuthForm) => void
  onModeChange: (mode: 'login' | 'register') => void
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

          <div>
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={authForm.password}
              onChange={(event) => onChange({ ...authForm, password: event.target.value })}
              placeholder="********"
              required
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Aguarde...' : authMode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

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

function Sidebar({
  canAccessAudit,
  currentPage,
  onNavigate,
  userProfile,
  onLogout,
}: {
  canAccessAudit: boolean
  currentPage: Page
  onNavigate: (page: Page) => void
  userProfile: { name: string; role: RoleLabel }
  onLogout: () => void
}) {
  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-decision' as const, label: 'Nova Decisão', icon: FileText },
    { id: 'history' as const, label: 'Histórico de Decisões', icon: FolderOpen },
    ...(canAccessAudit
      ? [{ id: 'audit' as const, label: 'Trilha de Auditoria', icon: History }]
      : []),
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="DecisionLog" />
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
        {menuItems.map((item) => {
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

      <div className="sidebar-footer">
        <button type="button" onClick={onLogout}>
          <LogOut />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}

function Dashboard({ decisions, isLoading }: { decisions: DecisionView[]; isLoading: boolean }) {
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
      <h1>Visão Geral Estratégica</h1>

      <div className="kpi-grid">
        <KpiCard icon={FileText} label="Total de Decisões" value={totalDecisions} tone="primary" />
        <KpiCard icon={Clock} label="Decisões Pendentes" value={pendingDecisions} tone="warning" />
        <KpiCard icon={CheckCircle2} label="Decisões Concluídas" value={completedDecisions} tone="success" />
      </div>

      {isLoading && <p className="loading-text">Carregando informações...</p>}

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

function NewDecision({
  editingDecision,
  isSubmitting,
  onCancelEdit,
  onSave,
  userRole,
}: {
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
          departamento: editingDecision.departamento,
          impacto: editingDecision.impacto,
          status: editingDecision.status === 'Concluída' ? 'Concluída' : 'Pendente',
          descricao: editingDecision.descricao,
        }
      : emptyDecisionForm,
  )

  const isReadOnly = userRole === 'Auditor'

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
                value={formData.departamento}
                onChange={(event) => setFormData({ ...formData, departamento: event.target.value })}
                required
              >
                <option value="">Selecione...</option>
                <option value="Financeiro">Financeiro</option>
                <option value="RH">RH</option>
                <option value="Operações">Operações</option>
                <option value="TI">TI</option>
                <option value="Comercial">Comercial</option>
                <option value="Jurídico">Jurídico</option>
                <option value="Compliance">Compliance</option>
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
  userRole,
  onEdit,
  onDelete,
  onView,
}: {
  decisions: DecisionView[]
  userRole: RoleLabel
  onEdit: (decision: DecisionView) => void
  onDelete: (id: string) => void
  onView: (decision: DecisionView) => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const canEdit = userRole === 'Administrador' || userRole === 'Gestor'
  const filteredDecisions = decisions.filter(
    (decision) =>
      decision.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      decision.departamento.toLowerCase().includes(searchTerm.toLowerCase()),
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

      <div className="table-card">
        <div className="table-scroll">
          <table>
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
                        {canEdit && (
                          <>
                            <button className="gold" type="button" onClick={() => onEdit(decision)} title="Editar">
                              <Edit2 />
                            </button>
                            <button className="danger" type="button" onClick={() => onDelete(decision.id)} title="Inativar">
                              <Trash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function AuditTrail({ events }: { events: AuditLog[] }) {
  return (
    <section className="page-section">
      <h1>Histórico de Alterações</h1>

      <div className="audit-card">
        <div className="timeline">
          {events.length === 0 ? (
            <p className="empty-message">Nenhum evento de auditoria registrado</p>
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
    </section>
  )
}

function ViewDecisionModal({ decision, onClose }: { decision: DecisionView | null; onClose: () => void }) {
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
