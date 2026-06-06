import { X } from 'lucide-react'

type LegalModalProps = {
  type: 'terms' | 'privacy' | null
  onClose: () => void
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null

  const isTerms = type === 'terms'

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card legal-modal" onMouseDown={(event) => event.stopPropagation()}>
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
              <div className="legal-topic-grid">
                <article>
                  <strong>Responsabilidade</strong>
                  <span>O usuário responde pelas decisões, comentários e alterações realizadas com sua conta.</span>
                </article>
                <article>
                  <strong>Uso permitido</strong>
                  <span>A plataforma deve ser usada apenas para registros corporativos autorizados.</span>
                </article>
              </div>
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
              <div className="legal-topic-grid">
                <article>
                  <strong>Quem acessa</strong>
                  <span>Administradores veem dados de contato e perfil para gestão. Auditores veem rastros necessários à conformidade.</span>
                </article>
                <article>
                  <strong>Por quanto tempo</strong>
                  <span>Dados operacionais ficam ativos enquanto a conta existir. Logs de auditoria podem ser mantidos para comprovação.</span>
                </article>
                <article>
                  <strong>Direitos do usuário</strong>
                  <span>O usuário pode solicitar correção, atualização e esclarecimentos sobre o tratamento de dados.</span>
                </article>
                <article>
                  <strong>Base de segurança</strong>
                  <span>O sistema registra ações importantes para proteger integridade, permissão e rastreabilidade.</span>
                </article>
              </div>
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
