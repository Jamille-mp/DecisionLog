import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import logo from '../assets/decisionlog-logo.png'
import type { AuthForm, AuthMode, OidcConfig } from '../types'

type AuthPageProps = {
  authForm: AuthForm
  authMode: AuthMode
  isSubmitting: boolean
  onChange: (form: AuthForm) => void
  onOpenLegal: (type: 'terms' | 'privacy') => void
  onModeChange: (mode: AuthMode) => void
  onOidcLogin: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  oidcConfig: OidcConfig
}

export function AuthPage({
  authForm,
  authMode,
  isSubmitting,
  onChange,
  onOpenLegal,
  onModeChange,
  onOidcLogin,
  onSubmit,
  oidcConfig,
}: AuthPageProps) {
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const authTitle =
    authMode === 'company-register'
      ? 'Cadastrar empresa'
      : authMode === 'register'
        ? 'Criar acesso'
        : authMode === 'forgot'
          ? 'Recuperar senha'
          : authMode === 'reset'
            ? 'Redefinir senha'
            : 'Entrar na plataforma'
  const authDescription =
    authMode === 'company-register'
      ? 'Cadastre a empresa e crie o primeiro administrador do ambiente corporativo.'
      : authMode === 'register'
        ? 'Solicite seu acesso com aceite dos termos e política de privacidade.'
        : authMode === 'forgot'
          ? 'Informe seu e-mail corporativo para receber as instruções de recuperação.'
          : authMode === 'reset'
            ? 'Digite o código recebido e cadastre uma nova senha segura.'
            : 'Use suas credenciais para acessar decisões, auditoria e indicadores.'

  if (!showLoginPanel) {
    return (
      <div className="presentation-page">
        <header className="presentation-topbar">
          <div>
            <img src={logo} alt="DecisionLog" />
            <div>
              <strong>DecisionLog</strong>
              <span>Governança de decisões</span>
            </div>
          </div>
          <div className="presentation-topbar-actions">
            <button className="presentation-login-button" type="button" onClick={() => setShowLoginPanel(true)}>
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
                <button type="button" onClick={() => setShowLoginPanel(true)}>
                  Acessar plataforma
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setShowLoginPanel(true)
                    onModeChange('company-register')
                  }}
                >
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
                A plataforma foi pensada para ambientes corporativos em que decisões precisam ter contexto,
                responsável, histórico e evidências consultáveis sem depender de conversas soltas.
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
            <button type="button" onClick={() => setShowLoginPanel(true)}>
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

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-intro-panel">
          <div className="login-brand-block">
            <img src={logo} alt="DecisionLog" />
            <div>
              <span>Acesso corporativo</span>
              <h1>Entre para acompanhar decisões com clareza.</h1>
              <p>Use sua conta para registrar, consultar e auditar decisões conforme seu perfil de acesso.</p>
            </div>
          </div>
          <div className="login-assurance-list">
            <div>
              <strong>Permissões por perfil</strong>
              <span>Administrador, gestor e auditor veem apenas o que faz sentido para sua função.</span>
            </div>
            <div>
              <strong>Rastreabilidade</strong>
              <span>Alterações importantes ficam registradas para consulta e prestação de contas.</span>
            </div>
            <div>
              <strong>Privacidade</strong>
              <span>Cadastro com aceite de termos e tratamento de dados conforme LGPD.</span>
            </div>
          </div>
        </section>
        <div className="login-card">
          <button
            className="auth-back-button"
            type="button"
            onClick={() => {
              if (authMode === 'login') {
                setShowLoginPanel(false)
                return
              }

              onModeChange('login')
            }}
          >
            <ArrowLeft />
            {authMode === 'login' ? 'Apresentação' : 'Login'}
          </button>
          <div className="login-card-header">
            <img src={logo} alt="DecisionLog" />
            <div>
              <span>DecisionLog</span>
              <h2>{authTitle}</h2>
              <p>{authDescription}</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="login-form">
            {authMode === 'company-register' && (
              <div>
                <label htmlFor="companyName">Empresa</label>
                <input
                  id="companyName"
                  value={authForm.companyName}
                  onChange={(event) => onChange({ ...authForm, companyName: event.target.value })}
                  placeholder="Nome da empresa"
                  required
                />
              </div>
            )}
            {(authMode === 'register' || authMode === 'company-register') && (
              <div>
                <label htmlFor="name">Nome</label>
                <input
                  id="name"
                  value={authForm.name}
                  onChange={(event) => onChange({ ...authForm, name: event.target.value })}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            )}
            {authMode === 'register' && (
              <div>
                <label htmlFor="companyAccessCode">CÃ³digo da empresa</label>
                <input
                  id="companyAccessCode"
                  value={authForm.companyAccessCode}
                  onChange={(event) => onChange({ ...authForm, companyAccessCode: event.target.value.toUpperCase() })}
                  placeholder="Ex: DL-AESA01"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={authForm.email}
                onChange={(event) => onChange({ ...authForm, email: event.target.value })}
                placeholder="seu.email@empresa.com"
                required
              />
            </div>
            {authMode === 'reset' && (
              <div>
                <label htmlFor="resetToken">Código de recuperação</label>
                <input
                  id="resetToken"
                  value={authForm.resetToken}
                  onChange={(event) => onChange({ ...authForm, resetToken: event.target.value })}
                  placeholder="Cole o código recebido"
                  required
                />
              </div>
            )}
            {authMode !== 'forgot' && (
              <div>
                <label htmlFor="password">{authMode === 'reset' ? 'Nova senha' : 'Senha'}</label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    minLength={authMode === 'login' ? undefined : 8}
                    pattern={
                      authMode === 'login'
                        ? undefined
                        : '^(?!.*(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210))(?=.*[A-Za-zÀ-ÿ])(?=.*\\d)(?=.*[^A-Za-zÀ-ÿ0-9]).{8,}$'
                    }
                    title="Use 8 caracteres ou mais, com letra, número, caractere especial e sem sequência numérica."
                    value={authForm.password}
                    onChange={(event) => onChange({ ...authForm, password: event.target.value })}
                    placeholder={authMode === 'login' ? '********' : 'Ex: Decisão@26'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                {authMode !== 'login' && (
                  <small className="field-hint">
                    Mínimo 8 caracteres, com letra, número, caractere especial e sem sequência numérica.
                  </small>
                )}
              </div>
            )}
            {authMode === 'company-register' && (
              <small className="field-hint">
                O domínio do e-mail do administrador será usado como domínio autorizado da empresa.
              </small>
            )}
            {(authMode === 'register' || authMode === 'company-register') && (
              <div className="consent-box">
                <strong>Consentimento e privacidade</strong>
                <div className="legal-actions">
                  <button type="button" onClick={() => onOpenLegal('terms')}>
                    Ler Termos de Uso
                  </button>
                  <button type="button" onClick={() => onOpenLegal('privacy')}>
                    Ler Política de Privacidade
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
                    </button>{' '}
                    do DecisionLog.
                  </span>
                </label>
                <label>
                  <input
                    checked={authForm.acceptedPrivacy}
                    onChange={(event) => onChange({ ...authForm, acceptedPrivacy: event.target.checked })}
                    required
                    type="checkbox"
                  />
                  <span>Autorizo o tratamento dos meus dados conforme a LGPD e a Política de Privacidade.</span>
                </label>
              </div>
            )}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Aguarde...'
                : authMode === 'login'
                  ? 'Entrar'
                  : authMode === 'register'
                    ? 'Cadastrar'
                    : authMode === 'company-register'
                      ? 'Cadastrar empresa'
                      : authMode === 'forgot'
                        ? 'Enviar instruções'
                        : 'Redefinir senha'}
            </button>
          </form>
          {authMode === 'login' && oidcConfig.enabled && (
            <div className="oidc-access-block">
              <label htmlFor="oidcCompanyAccessCode">CÃ³digo da empresa</label>
              <input
                id="oidcCompanyAccessCode"
                value={authForm.companyAccessCode}
                onChange={(event) => onChange({ ...authForm, companyAccessCode: event.target.value.toUpperCase() })}
                placeholder="Somente para primeiro acesso"
              />
              <button className="oidc-button" type="button" onClick={onOidcLogin}>
                {oidcConfig.providerName}
              </button>
            </div>
          )}
          {authMode === 'login' && (
            <div className="password-recovery-row">
              <button className="mode-button subtle" type="button" onClick={() => onModeChange('forgot')}>
                Esqueci minha senha
              </button>
            </div>
          )}
          <div className="auth-switcher">
            <button
              className="mode-button"
              type="button"
              onClick={() => onModeChange(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Criar uma conta' : 'Já tenho uma conta'}
            </button>
            {authMode === 'login' && (
              <button className="mode-button subtle" type="button" onClick={() => onModeChange('company-register')}>
                Cadastrar empresa
              </button>
            )}
          </div>
        </div>
      </div>
      <footer className="login-footer">
        <strong>DecisionLog</strong>
        <span>© 2026 DecisionLog. Todos os direitos reservados.</span>
      </footer>
    </div>
  )
}
