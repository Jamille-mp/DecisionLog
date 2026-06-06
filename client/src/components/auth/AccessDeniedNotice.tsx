import { ShieldAlert } from 'lucide-react'

type AccessDeniedNoticeProps = {
  authMode: 'login' | 'register' | 'company-register' | 'forgot' | 'reset'
  message: string
  onClear: () => void
  onUseInvite: () => void
}

export function AccessDeniedNotice({ authMode, message, onClear, onUseInvite }: AccessDeniedNoticeProps) {
  return (
    <section className="access-denied-card" role="alert" aria-live="polite">
      <ShieldAlert />
      <div>
        <strong>Acesso não autorizado</strong>
        <p>{message}</p>
        <ul>
          <li>Confirme se o e-mail pertence à empresa cadastrada.</li>
          <li>No primeiro acesso, use o código de convite enviado pelo administrador.</li>
          <li>Se o acesso deveria existir, solicite a revisão do seu perfil.</li>
        </ul>
      </div>
      <div className="access-denied-actions">
        {authMode === 'login' && (
          <button type="button" onClick={onUseInvite}>
            Usar convite
          </button>
        )}
        <button type="button" onClick={onClear}>
          Entendi
        </button>
      </div>
    </section>
  )
}
