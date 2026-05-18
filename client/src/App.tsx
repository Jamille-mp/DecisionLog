import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FilePenLine,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Search,
  ShieldCheck,
  Trash2,
  User as UserIcon,
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
import './App.css'

type User = {
  id: string
  name: string
  email: string
}

type Decision = {
  id: string
  title: string
  context: string
  decision: string
  reason: string
  status: string
  createdAt: string
  user?: User | null
}

type AuditLog = {
  id: string
  action: string
  userId?: string
  details?: Record<string, unknown>
  timestamp: string
}

type FormState = {
  title: string
  context: string
  decision: string
  reason: string
}

type AuthState = {
  name: string
  email: string
  password: string
}

const emptyForm: FormState = {
  title: '',
  context: '',
  decision: '',
  reason: '',
}

const emptyAuth: AuthState = {
  name: '',
  email: '',
  password: '',
}

const apiUrl = 'http://localhost:3333'
const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Aprovadas', value: 'approved' },
  { label: 'Arquivadas', value: 'archived' },
]

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  archived: 'Arquivada',
}

const statusChartColors: Record<string, string> = {
  pending: '#D4B062',
  approved: '#10B981',
  archived: '#64748B',
}

const actionLabels: Record<string, string> = {
  USER_REGISTERED: 'Usuário cadastrado',
  USER_LOGGED_IN: 'Login realizado',
  DECISIONS_VIEWED: 'Decisões visualizadas',
  DECISION_CREATED: 'Decisão criada',
  DECISION_UPDATED: 'Decisão atualizada',
  DECISION_DELETED: 'Decisão excluída',
}

function App() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [authForm, setAuthForm] = useState<AuthState>(emptyAuth)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [token, setToken] = useState(() => localStorage.getItem('decisionlog:token') || '')
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('decisionlog:user')
    return storedUser ? (JSON.parse(storedUser) as User) : null
  })
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [activeView, setActiveView] = useState<'decisions' | 'audit'>('decisions')
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  async function loadDecisions(currentToken = token, filters = { statusFilter, search }) {
    if (!currentToken) {
      return
    }

    setIsLoading(true)
    const params = new URLSearchParams()

    if (filters.statusFilter) {
      params.set('status', filters.statusFilter)
    }

    if (filters.search.trim()) {
      params.set('search', filters.search.trim())
    }

    const response = await fetch(`${apiUrl}/decisions?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Não foi possível carregar as decisões.')
    }

    const data = (await response.json()) as Decision[]
    setDecisions(data)
    setIsLoading(false)
  }

  async function loadAuditLogs(currentToken = token) {
    if (!currentToken) {
      return
    }

    setIsLoading(true)
    const response = await fetch(`${apiUrl}/audit-logs`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Não foi possível carregar a auditoria.')
    }

    const data = (await response.json()) as AuditLog[]
    setAuditLogs(data)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    const loader =
      activeView === 'audit' ? () => loadAuditLogs() : () => loadDecisions()

    loader()
      .catch(() => {
        setMessage('Sessão expirada ou API indisponível. Faça login novamente.')
        handleLogout()
      })
      .finally(() => setIsLoading(false))
  }, [token, statusFilter, search, activeView])

  function updateField(field: keyof FormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function updateAuthField(field: keyof AuthState, value: string) {
    setAuthForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
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
        setAuthMode('login')
        setAuthForm((currentForm) => ({ ...currentForm, password: '' }))
        setMessage('Usuário cadastrado. Agora faça login.')
        toast.success('Usuário cadastrado. Agora faça login.')
        return
      }

      const data = (await response.json()) as { token: string; user: User }
      localStorage.setItem('decisionlog:token', data.token)
      localStorage.setItem('decisionlog:user', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      setAuthForm(emptyAuth)
      setMessage('')
      toast.success('Login realizado.')
    } catch {
      setMessage('Não foi possível autenticar. Confira os dados e a API.')
      toast.error('Não foi possível autenticar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const isEditing = Boolean(editingDecision)
      const response = await fetch(
        isEditing ? `${apiUrl}/decisions/${editingDecision?.id}` : `${apiUrl}/decisions`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        },
      )

      if (!response.ok) {
        throw new Error('Não foi possível salvar a decisão.')
      }

      const savedDecision = (await response.json()) as Decision

      if (isEditing) {
        setDecisions((currentDecisions) =>
          matchesCurrentFilters(savedDecision)
            ? currentDecisions.map((item) =>
                item.id === savedDecision.id ? savedDecision : item,
              )
            : currentDecisions.filter((item) => item.id !== savedDecision.id),
        )
        setEditingDecision(null)
        toast.success('Decisão atualizada.')
      } else {
        setDecisions((currentDecisions) =>
          matchesCurrentFilters(savedDecision)
            ? [savedDecision, ...currentDecisions]
            : currentDecisions,
        )
        toast.success('Decisão registrada.')
      }

      setForm(emptyForm)
      setMessage(isEditing ? 'Decisão atualizada.' : 'Decisão registrada com sucesso.')
    } catch {
      setMessage('Erro ao salvar. Confira se o backend está rodando.')
      toast.error('Erro ao salvar decisão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateDecisionStatus(decisionId: string, status: string) {
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/decisions/${decisionId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('Não foi possível atualizar a decisão.')
      }

      const updatedDecision = (await response.json()) as Decision
      setDecisions((currentDecisions) =>
        matchesCurrentFilters(updatedDecision)
          ? currentDecisions.map((item) =>
              item.id === updatedDecision.id ? updatedDecision : item,
            )
          : currentDecisions.filter((item) => item.id !== updatedDecision.id),
      )
      setMessage('Status atualizado.')
      toast.success('Status atualizado.')
    } catch {
      setMessage('Erro ao atualizar status.')
      toast.error('Erro ao atualizar status.')
    }
  }

  async function deleteDecision(decisionId: string) {
    setMessage('')

    try {
      const response = await fetch(`${apiUrl}/decisions/${decisionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Não foi possível excluir a decisão.')
      }

      setDecisions((currentDecisions) =>
        currentDecisions.filter((item) => item.id !== decisionId),
      )
      setMessage('Decisão excluída.')
      toast.success('Decisão excluída.')
    } catch {
      setMessage('Erro ao excluir decisão.')
      toast.error('Erro ao excluir decisão.')
    }
  }

  function startEditing(decisionItem: Decision) {
    setEditingDecision(decisionItem)
    setForm({
      title: decisionItem.title,
      context: decisionItem.context,
      decision: decisionItem.decision,
      reason: decisionItem.reason,
    })
    setActiveView('decisions')
  }

  function cancelEditing() {
    setEditingDecision(null)
    setForm(emptyForm)
  }

  function matchesCurrentFilters(decisionItem: Decision) {
    const query = search.trim().toLowerCase()
    const matchesStatus = !statusFilter || decisionItem.status === statusFilter
    const matchesSearch =
      !query ||
      [
        decisionItem.title,
        decisionItem.context,
        decisionItem.decision,
        decisionItem.reason,
      ].some((value) => value.toLowerCase().includes(query))

    return matchesStatus && matchesSearch
  }

  function handleLogout() {
    localStorage.removeItem('decisionlog:token')
    localStorage.removeItem('decisionlog:user')
    setToken('')
    setUser(null)
    setDecisions([])
    setAuditLogs([])
  }

  const dashboard = decisions.reduce(
    (summary, item) => ({
      total: summary.total + 1,
      pending: summary.pending + (item.status === 'pending' ? 1 : 0),
      approved: summary.approved + (item.status === 'approved' ? 1 : 0),
      archived: summary.archived + (item.status === 'archived' ? 1 : 0),
    }),
    {
      total: 0,
      pending: 0,
      approved: 0,
      archived: 0,
    },
  )

  const latestDecisions = decisions.slice(0, 3)
  const chartData = [
    { name: 'Pendentes', value: dashboard.pending, status: 'pending' },
    { name: 'Aprovadas', value: dashboard.approved, status: 'approved' },
    { name: 'Arquivadas', value: dashboard.archived, status: 'archived' },
  ]

  if (!token || !user) {
    return (
      <main className="app-shell auth-shell">
        <Toaster richColors position="top-right" />
        <section className="panel auth-panel">
          <div className="section-heading">
            <span className="eyebrow">DecisionLog</span>
            <h1>{authMode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
          </div>

          <form onSubmit={handleAuthSubmit} className="decision-form">
            {authMode === 'register' && (
              <label>
                Nome
                <input
                  value={authForm.name}
                  onChange={(event) => updateAuthField('name', event.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </label>
            )}

            <label>
              E-mail
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => updateAuthField('email', event.target.value)}
                placeholder="seu.email@exemplo.com"
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => updateAuthField('password', event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Aguarde...'
                : authMode === 'login'
                  ? 'Entrar'
                  : 'Cadastrar'}
            </button>
          </form>

          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setAuthMode((currentMode) =>
                currentMode === 'login' ? 'register' : 'login',
              )
              setMessage('')
            }}
          >
            {authMode === 'login' ? 'Criar uma conta' : 'Já tenho uma conta'}
          </button>

          {message && <p className="status-message">{message}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell app-layout">
      <Toaster richColors position="top-right" />
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">DL</div>
          <div>
            <strong>DecisionLog</strong>
            <span>Plataforma corporativa</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <span>Gestor</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          <button
            type="button"
            className={activeView === 'decisions' ? 'active' : ''}
            onClick={() => setActiveView('decisions')}
          >
            <LayoutDashboard size={18} />
            Painel de decisões
          </button>
          <button
            type="button"
            className={activeView === 'audit' ? 'active' : ''}
            onClick={() => setActiveView('audit')}
          >
            <History size={18} />
            Trilha de auditoria
          </button>
        </nav>

        <button className="sidebar-logout" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>

      <section className="main-area">
        <header className="app-header">
          <div>
            <span className="eyebrow">Visão geral estratégica</span>
            <h1>Gestão de decisões</h1>
            <p>Registre, acompanhe e audite decisões importantes do projeto.</p>
          </div>
          <div className="session-card">
            <span>Sessão ativa</span>
            <strong>{user.name}</strong>
          </div>
        </header>

        <section className="workspace">
        <aside className="panel form-panel">
          <div className="section-heading">
            <span className="eyebrow">Registro</span>
            <h1>{editingDecision ? 'Editar decisão' : 'Registrar decisão'}</h1>
            <p className="user-line">Logado como {user.name}</p>
          </div>

          <form onSubmit={handleSubmit} className="decision-form">
            <label>
              Título
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Ex: Escolha do banco de dados"
                required
              />
            </label>

            <label>
              Contexto
              <textarea
                value={form.context}
                onChange={(event) => updateField('context', event.target.value)}
                placeholder="Cenário, restrições, pessoas envolvidas..."
                required
              />
            </label>

            <label>
              Decisão
              <textarea
                value={form.decision}
                onChange={(event) => updateField('decision', event.target.value)}
                placeholder="Qual foi a escolha feita?"
                required
              />
            </label>

            <label>
              Motivo
              <textarea
                value={form.reason}
                onChange={(event) => updateField('reason', event.target.value)}
                placeholder="Por que essa escolha faz sentido?"
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {editingDecision ? <FilePenLine size={17} /> : <PlusCircle size={17} />}
              {isSubmitting
                ? 'Salvando...'
                : editingDecision
                  ? 'Atualizar decisão'
                  : 'Salvar decisão'}
            </button>
          </form>

          {editingDecision && (
            <button className="ghost-button" type="button" onClick={cancelEditing}>
              Cancelar edição
            </button>
          )}

          <button className="ghost-button" type="button" onClick={handleLogout}>
            <LogOut size={17} />
            Sair
          </button>

          {message && <p className="status-message">{message}</p>}
        </aside>

        <section className="panel list-panel">
          <div className="section-heading with-tabs">
            <div>
              <span className="eyebrow">Monitoramento</span>
              <h2>{activeView === 'audit' ? 'Auditoria' : 'Decisões registradas'}</h2>
            </div>
            <nav className="view-tabs" aria-label="Navegação da área de trabalho">
              <button
                type="button"
                className={activeView === 'decisions' ? 'active' : ''}
                onClick={() => setActiveView('decisions')}
              >
                <LayoutDashboard size={16} />
                Decisões
              </button>
              <button
                type="button"
                className={activeView === 'audit' ? 'active' : ''}
                onClick={() => setActiveView('audit')}
              >
                <History size={16} />
                Auditoria
              </button>
            </nav>
          </div>

          {activeView === 'audit' ? (
            <section className="audit-timeline-panel">
              {isLoading ? (
                <p className="empty-state">Carregando auditoria...</p>
              ) : auditLogs.length === 0 ? (
                <p className="empty-state">
                  Nenhum log encontrado. Verifique se o MongoDB está rodando.
                </p>
              ) : (
                auditLogs.map((log, index) => (
                  <article className="audit-event" key={log.id}>
                    {index !== auditLogs.length - 1 && <span className="timeline-line" />}
                    <div className="timeline-dot">
                      <Clock size={16} />
                    </div>
                    <div className="audit-event-content">
                      <div className="audit-event-header">
                        <div>
                          <h3>{actionLabels[log.action] || log.action}</h3>
                          <p>
                            <UserIcon size={15} />
                            {log.userId || 'sem usuário informado'}
                          </p>
                        </div>
                        <time dateTime={log.timestamp}>
                          {new Intl.DateTimeFormat('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(log.timestamp))}
                        </time>
                      </div>
                      <div className="audit-decision-line">
                        <FileText size={15} />
                        <span>
                          {typeof log.details?.title === 'string'
                            ? log.details.title
                            : typeof log.details?.decisionId === 'string'
                              ? `Decisão ${log.details.decisionId}`
                              : 'Evento do sistema'}
                        </span>
                      </div>
                      <pre>{JSON.stringify(log.details || {}, null, 2)}</pre>
                    </div>
                  </article>
                ))
              )}
            </section>
          ) : (
            <>
              <section className="dashboard" aria-label="Resumo das decisões">
                <article>
                  <FileText size={22} />
                  <span>Total</span>
                  <strong>{dashboard.total}</strong>
                </article>
                <article>
                  <ClipboardList size={22} />
                  <span>Pendentes</span>
                  <strong>{dashboard.pending}</strong>
                </article>
                <article>
                  <CheckCircle2 size={22} />
                  <span>Aprovadas</span>
                  <strong>{dashboard.approved}</strong>
                </article>
                <article>
                  <ShieldCheck size={22} />
                  <span>Arquivadas</span>
                  <strong>{dashboard.archived}</strong>
                </article>
              </section>

              <section className="analytics-grid" aria-label="Gráficos de decisões">
                <article className="chart-panel">
                  <h3>Distribuição por status</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="name" stroke="#64748B" />
                      <YAxis allowDecimals={false} stroke="#64748B" />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry) => (
                          <Cell key={entry.status} fill={statusChartColors[entry.status]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </article>

                <article className="chart-panel">
                  <h3>Participação dos status</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={chartData.filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) =>
                          `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.status} fill={statusChartColors[entry.status]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </article>
              </section>

              {latestDecisions.length > 0 && (
                <section className="latest-decisions" aria-label="Últimas decisões">
                  <h3>Últimas decisões</h3>
                  <ul>
                    {latestDecisions.map((item) => (
                      <li key={item.id}>
                        <span>{item.title}</span>
                        <strong>{statusLabels[item.status] || item.status}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="filters">
                <label>
                  Buscar
                  <div className="input-with-icon">
                    <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Título, contexto, decisão ou motivo"
                  />
                  </div>
                </label>

                <label>
                  Status
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value || 'all'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {isLoading ? (
                <p className="empty-state">Carregando registros...</p>
              ) : decisions.length === 0 ? (
                <p className="empty-state">Nenhuma decisão registrada ainda.</p>
              ) : (
                <div className="decision-table-shell">
                  <table className="decision-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Status</th>
                        <th>Autor</th>
                        <th>Data</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.map((item) => (
                        <tr key={item.id}>
                          <td>#{item.id.slice(0, 8)}</td>
                          <td>
                            <strong>{item.title}</strong>
                            <span>{item.decision}</span>
                          </td>
                          <td>
                            <span className={`status-badge status-${item.status}`}>
                              {statusLabels[item.status] || item.status}
                            </span>
                          </td>
                          <td>{item.user?.name || 'Registro anterior ao login'}</td>
                          <td>
                            {new Intl.DateTimeFormat('pt-BR', {
                              dateStyle: 'short',
                            }).format(new Date(item.createdAt))}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="icon-button edit"
                                type="button"
                                onClick={() => startEditing(item)}
                                title="Editar"
                              >
                                <FilePenLine size={16} />
                              </button>
                              <button
                                className="icon-button approve"
                                type="button"
                                onClick={() => updateDecisionStatus(item.id, 'approved')}
                                disabled={item.status === 'approved'}
                                title="Aprovar"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                className="icon-button archive"
                                type="button"
                                onClick={() => updateDecisionStatus(item.id, 'archived')}
                                disabled={item.status === 'archived'}
                                title="Arquivar"
                              >
                                <ShieldCheck size={16} />
                              </button>
                              <button
                                className="icon-button danger"
                                type="button"
                                onClick={() => deleteDecision(item.id)}
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
        </section>
      </section>
    </main>
  )
}

export default App
