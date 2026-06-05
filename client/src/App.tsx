import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowLeft,
  FileText,
  LogOut,
  Menu,
  Settings,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'
import logo from './assets/decisionlog-logo.png'
import { CompanyBadge } from './components/shared/CompanyBadge'
import { ViewDecisionModal } from './components/decisions/ViewDecisionModal'
import { LegalModal } from './components/legal/LegalModal'
import { AppFooter } from './components/layout/AppFooter'
import { Sidebar } from './components/layout/Sidebar'
import { apiUrl } from './config/app'
import { emptyAuthForm, roleLabels } from './constants/app'
import { toDecisionView, toPayload } from './domain/decisions'
import { authHeaders } from './services/http'
import type {
  ApiDecision,
  AuditLog,
  AuthForm,
  AuthMode,
  DecisionFormData,
  DecisionView,
  Department,
  Health,
  OidcConfig,
  Page,
  ProfileFormData,
  User,
} from './types'
import { isStrongPassword } from './utils/format'
import { Dashboard } from './pages/Dashboard'
import { DecisionHistory } from './pages/DecisionHistory'
import { HelpPage } from './pages/HelpPage'
import { AuditTrail } from './pages/AuditTrail'
import { AuthPage } from './pages/AuthPage'
import { DepartmentsPage } from './pages/DepartmentsPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { NewDecision } from './pages/NewDecision'
import { ProfilePage } from './pages/ProfilePage'
import { UsersPage } from './pages/UsersPage'
import './App.css'

function getInitialAuthError() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const oidcError = params.get('auth_error')

  if (!oidcError) return null

  return (
    params.get('auth_message') ||
    'Sua conta não possui autorização para acessar esta empresa no DecisionLog.'
  )
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuthForm)
  const [authError, setAuthError] = useState<string | null>(() => getInitialAuthError())
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
    avatarUrl: user?.avatarUrl || '',
    company: user?.company?.name || 'Empresa',
    companyLogoUrl: user?.company?.logoUrl || '',
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
    const oidcError = params.get('auth_error')

    if (oidcError) {
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

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
        setAuthError(null)
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
        setAuthError(null)
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
                companyAccessCode: authForm.companyAccessCode,
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
        setAuthError(null)
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
      setAuthError(null)
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
    setAuthError(null)
    const params = new URLSearchParams()
    if (authForm.companyAccessCode.trim()) {
      params.set('companyAccessCode', authForm.companyAccessCode.trim())
    }

    window.location.href = `${apiUrl}/auth/oidc/start${params.size ? `?${params.toString()}` : ''}`
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
      const payload: Record<string, string | null> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
        preferredTheme: data.preferredTheme,
      }

      if (user?.role === 'admin') {
        payload.companyLogoUrl = data.companyLogoUrl
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
        <AuthPage
          authForm={authForm}
          authError={authError}
          authMode={authMode}
          isSubmitting={isSubmitting}
          onChange={setAuthForm}
          onOpenLegal={setLegalModal}
          onModeChange={setAuthMode}
          onClearAuthError={() => setAuthError(null)}
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
            {userProfile.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt={`Foto de ${userProfile.name}`} />
            ) : (
              userProfile.initials
            )}
          </button>
          {isProfileMenuOpen && (
            <div className="profile-popover">
              <div className="profile-popover-header">
                <strong>{userProfile.name}</strong>
                <span>{userProfile.role}</span>
                <CompanyBadge
                  className="company-badge-light"
                  logoUrl={userProfile.companyLogoUrl}
                  name={userProfile.company}
                />
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

export default App
