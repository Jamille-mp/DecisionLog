import { defaultImageFrameSettings } from '../../constants/app'
import type { ImageFrameSettings } from '../../types'
import { getInitials } from '../../utils/format'

export function ProfileAvatar({
  className = '',
  frame = defaultImageFrameSettings,
  imageUrl,
  name,
}: {
  className?: string
  frame?: ImageFrameSettings
  imageUrl?: string | null
  name: string
}) {
  return (
    <div className={`profile-avatar ${className}`.trim()}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Foto de ${name}`}
          style={{ transform: `translate(${frame.x}%, ${frame.y}%) scale(${frame.zoom})` }}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
