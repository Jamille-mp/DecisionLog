import {
  Activity,
  Building2,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Settings,
  Users,
  X,
} from 'lucide-react'
import logo from '../../assets/decisionlog-logo.png'
import { CompanyBadge } from '../shared/CompanyBadge'
import { ProfileAvatar } from '../shared/ProfileAvatar'
import type { Page, RoleLabel } from '../../types'

export type SidebarUserProfile = {
  avatarUrl: string
  company: string
  companyLogoUrl: string
  initials: string
  name: string
  role: RoleLabel
}

export function Sidebar({
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
  userProfile: SidebarUserProfile
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
        <ProfileAvatar imageUrl={userProfile.avatarUrl} name={userProfile.name} />
        <div className="profile-box-content">
          <p>{userProfile.name}</p>
          <span className="profile-role-badge">{userProfile.role}</span>
          <CompanyBadge logoUrl={userProfile.companyLogoUrl} name={userProfile.company} />
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
