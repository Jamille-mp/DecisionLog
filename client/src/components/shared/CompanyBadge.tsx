import { getInitials } from '../../utils/format'

export function CompanyBadge({
  className = '',
  label = 'Empresa ativa',
  name,
}: {
  className?: string
  label?: string
  name: string
}) {
  return (
    <div className={`company-badge ${className}`.trim()} title={`Empresa: ${name}`}>
      <span className="company-mark">{getInitials(name)}</span>
      <span className="company-label">{label}</span>
      <strong>{name}</strong>
    </div>
  )
}
