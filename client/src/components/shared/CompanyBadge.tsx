import { defaultImageFrameSettings } from '../../constants/app'
import type { ImageFrameSettings } from '../../types'
import { getInitials } from '../../utils/format'

export function CompanyBadge({
  className = '',
  frame = defaultImageFrameSettings,
  label = 'Empresa ativa',
  logoUrl,
  name,
}: {
  className?: string
  frame?: ImageFrameSettings
  label?: string
  logoUrl?: string | null
  name: string
}) {
  return (
    <div className={`company-badge ${className}`.trim()} title={`Empresa: ${name}`}>
      <span className="company-mark">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`Logo de ${name}`}
            style={{ transform: `translate(${frame.x}%, ${frame.y}%) scale(${frame.zoom})` }}
          />
        ) : (
          getInitials(name)
        )}
      </span>
      <span className="company-label">{label}</span>
      <strong>{name}</strong>
    </div>
  )
}
