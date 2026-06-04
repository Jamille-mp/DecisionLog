import type { PageHeaderProps } from '../../types'

export function PageHeader({ actions, badge, subtitle, title }: PageHeaderProps) {
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
