import { getInitials } from '../../utils/format'

export function ProfileAvatar({
  className = '',
  imageUrl,
  name,
}: {
  className?: string
  imageUrl?: string | null
  name: string
}) {
  return (
    <div className={`profile-avatar ${className}`.trim()}>
      {imageUrl ? (
        <img src={imageUrl} alt={`Foto de ${name}`} />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
