export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

export function isStrongPassword(password: string) {
  const hasMinimumLength = password.length >= 8
  const hasLetter = /[A-Za-zÀ-ÿ]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-zÀ-ÿ0-9]/.test(password)
  const hasSequentialNumbers = /(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210)/.test(password)

  return hasMinimumLength && hasLetter && hasNumber && hasSpecial && !hasSequentialNumbers
}

export function formatDateTime(value?: string) {
  if (!value) return 'Não informado'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function toIsoDateFromBrazilianDate(value: string) {
  const [day, month, year] = value.split('/')
  if (!day || !month || !year) return ''

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}
