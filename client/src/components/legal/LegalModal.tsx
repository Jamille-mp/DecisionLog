import { X } from 'lucide-react'

type LegalModalProps = {
  type: 'terms' | 'privacy' | null
  onClose: () => void
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null

  const isTerms = type === 'terms'

  return (
    <div className="modal-backdrop">
      <div className="modal-card legal-modal">
        <div className="modal-header">
          <h2>{isTerms ? 'Termos de Uso' : 'Política de Privacidade e LGPD'}</h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-content legal-content">
          <div className="legal-summary">
            <strong>{isTerms ? 'Antes de aceitar' : 'Tratamento de dados no DecisionLog'}</strong>
            <span>
              {isTerms
                ? 'Os termos explicam responsabilidades, uso permitido e consequências de uso indevido.'
                : 'A política explica quais dados são tratados, por qual motivo, quem acessa e quais direitos o usuário possui.'}
            </span>
          </div>
          {isTerms ? (
            <>
              <p>
                Ao utilizar o DecisionLog, o usuário declara que as informações registradas são verdadeiras e
                relacionadas às decisões da organização.
              </p>
              <p>
                O acesso é pessoal e não deve ser compartilhado. Cada ação pode ser registrada para fins de
                auditoria, rastreabilidade e segurança.
              </p>
              <p>
                O uso inadequado, a tentativa de acesso não autorizado ou a alteração indevida de registros podem
                levar à suspensão da conta.
              </p>
            </>
          ) : (
            <>
              <p>
                O DecisionLog trata nome, e-mail, telefone opcional, perfil de acesso e histórico de ações para
                autenticação, segurança e auditoria.
              </p>
              <p>
                Os dados são usados para identificar responsáveis por decisões e manter rastreabilidade, conforme os
                princípios de finalidade, necessidade e transparência da LGPD.
              </p>
              <p>
                O usuário pode atualizar seus dados de perfil na própria aplicação. Registros de auditoria são
                mantidos para integridade e prestação de contas.
              </p>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
