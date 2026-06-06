type PresentationPageProps = {
  logoSrc: string
  onEnter: () => void
  onRegisterCompany: () => void
}

export function PresentationPage({ logoSrc, onEnter, onRegisterCompany }: PresentationPageProps) {
  return (
    <div className="presentation-page">
      <header className="presentation-topbar">
        <div>
          <img src={logoSrc} alt="DecisionLog" />
          <div>
            <strong>DecisionLog</strong>
            <span>Governança de decisões</span>
          </div>
        </div>
        <div className="presentation-topbar-actions">
          <button className="presentation-login-button" type="button" onClick={onEnter}>
            Entrar
          </button>
        </div>
      </header>

      <main className="presentation-main" id="inicio">
        <section className="presentation-shell reveal-block">
          <div className="presentation-copy">
            <span>Decisões com contexto e confiança</span>
            <h1>Transforme decisões importantes em registros claros, seguros e fáceis de acompanhar.</h1>
            <p>
              O DecisionLog centraliza decisões corporativas, responsáveis, justificativas e histórico para que a
              equipe saiba exatamente o que foi decidido e por quê.
            </p>
            <div className="presentation-actions">
              <button type="button" onClick={onEnter}>
                Acessar plataforma
              </button>
              <button className="secondary" type="button" onClick={onRegisterCompany}>
                Cadastrar empresa
              </button>
            </div>
          </div>
          <div className="presentation-preview">
            <div className="preview-window">
              <div className="preview-heading">
                <span>Prévia ilustrativa</span>
                <strong>Painel de decisões</strong>
              </div>
              <div className="preview-kpis">
                <article>
                  <span>Decisões registradas</span>
                  <strong>128</strong>
                </article>
                <article>
                  <span>Pendentes</span>
                  <strong>14</strong>
                </article>
                <article>
                  <span>Alto impacto</span>
                  <strong>9</strong>
                </article>
              </div>
              <div className="preview-note">
                <strong>Hoje</strong>
                <span>3 decisões concluídas, 2 revisões abertas e 1 item arquivado para consulta futura.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="presentation-section reveal-block" id="sobre">
          <div className="presentation-section-heading">
            <span>Sobre</span>
            <h2>Um fluxo simples para decisões que precisam deixar rastro.</h2>
            <p>
              A plataforma foi pensada para ambientes corporativos em que decisões precisam ter contexto, responsável,
              histórico e evidências consultáveis sem depender de conversas soltas.
            </p>
          </div>
          <div className="presentation-process" aria-label="Ciclo de uso do DecisionLog">
            <article>
              <strong>1</strong>
              <span>Registre a decisão</span>
              <p>Informe contexto, área, impacto e responsável em um registro padronizado.</p>
            </article>
            <article>
              <strong>2</strong>
              <span>Acompanhe o status</span>
              <p>Visualize pendências, decisões concluídas e itens arquivados para consulta.</p>
            </article>
            <article>
              <strong>3</strong>
              <span>Consulte o histórico</span>
              <p>Recupere alterações e evidências quando houver auditoria ou prestação de contas.</p>
            </article>
          </div>
        </section>

        <section className="presentation-section presentation-benefits reveal-block" id="servicos">
          <div>
            <span>Menos ruído</span>
            <strong>Informações importantes ficam organizadas em um único lugar.</strong>
          </div>
          <div>
            <span>Mais responsabilidade</span>
            <strong>Cada decisão mantém responsável, área, impacto e justificativa.</strong>
          </div>
          <div>
            <span>Mais confiança</span>
            <strong>A equipe consulta dados e histórico sem depender de memória individual.</strong>
          </div>
        </section>

        <section className="presentation-section presentation-contact reveal-block" id="contato">
          <div>
            <span>Contato</span>
            <h2>Precisa falar com suporte ou com a equipe responsável?</h2>
            <div className="presentation-contact-list">
              <span>suporte@decisionlog.com</span>
              <span>(11) 4002-8922</span>
              <span>Atendimento em dias úteis, das 8h às 18h</span>
            </div>
          </div>
          <button type="button" onClick={onEnter}>
            Acessar área do cliente
          </button>
        </section>
      </main>

      <footer className="presentation-footer">
        <div>
          <strong>DecisionLog</strong>
          <span>Governança de decisões com rastreabilidade e segurança.</span>
        </div>
        <nav aria-label="Links institucionais">
          <span>Ambiente interno protegido por autenticação</span>
        </nav>
        <span>© 2026 DecisionLog. Todos os direitos reservados.</span>
      </footer>
    </div>
  )
}
