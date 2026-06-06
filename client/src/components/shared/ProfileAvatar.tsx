import { getInitials } from '../../utils/format'

export function ProfileAvatar({
  className = '',
  name,
}: {
  className?: string
  name: string
}) {
  return <div className={`profile-avatar ${className}`.trim()}>{getInitials(name)}</div>
}
