import type { AuthForm } from '../../types'

type LegalConsentProps = {
  authForm: AuthForm
  onChange: (form: AuthForm) => void
  onOpenLegal: (type: 'terms' | 'privacy') => void
}

export function LegalConsent({ authForm, onChange, onOpenLegal }: LegalConsentProps) {
  return (
    <div className="consent-box">
      <div className="consent-heading">
        <strong>Consentimento LGPD obrigatório</strong>
        <p>
          Para criar o acesso, leia os documentos e confirme que entende como seus dados serão usados no ambiente
          corporativo.
        </p>
      </div>
      <div className="legal-actions">
        <button type="button" onClick={() => onOpenLegal('terms')}>
          Ler Termos
        </button>
        <button type="button" onClick={() => onOpenLegal('privacy')}>
          Ler Privacidade
        </button>
      </div>
      <label>
        <input
          checked={authForm.acceptedTerms}
          onChange={(event) => onChange({ ...authForm, acceptedTerms: event.target.checked })}
          required
          type="checkbox"
        />
        <span>
          Li e aceito os{' '}
          <button className="text-link" type="button" onClick={() => onOpenLegal('terms')}>
            Termos de Uso
          </button>
          .
        </span>
      </label>
      <label>
        <input
          checked={authForm.acceptedPrivacy}
          onChange={(event) => onChange({ ...authForm, acceptedPrivacy: event.target.checked })}
          required
          type="checkbox"
        />
        <span>
          Autorizo o tratamento dos meus dados conforme a{' '}
          <button className="text-link" type="button" onClick={() => onOpenLegal('privacy')}>
            Política de Privacidade e LGPD
          </button>
          .
        </span>
      </label>
    </div>
  )
}
