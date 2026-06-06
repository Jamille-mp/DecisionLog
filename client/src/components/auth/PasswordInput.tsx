import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = {
  hint?: string
  id: string
  label: string
  minLength?: number
  pattern?: string
  placeholder?: string
  required?: boolean
  title?: string
  value: string
  onChange: (value: string) => void
}

export function PasswordInput({
  hint,
  id,
  label,
  minLength,
  onChange,
  pattern,
  placeholder,
  required,
  title,
  value,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input
          id={id}
          minLength={minLength}
          pattern={pattern}
          placeholder={placeholder}
          required={required}
          title={title}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {isVisible ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  )
}
