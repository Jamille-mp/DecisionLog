import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import logo from '../assets/decisionlog-logo.png'
import { AccessDeniedNotice } from '../components/auth/AccessDeniedNotice'
import { LegalConsent } from '../components/auth/LegalConsent'
import { PasswordInput } from '../components/auth/PasswordInput'
import { PresentationPage } from '../components/auth/PresentationPage'
import type { AuthForm, AuthMode, OidcConfig } from '../types'

type AuthPageProps = {
  authForm: AuthForm
  authError?: string | null
  authMode: AuthMode
  isSubmitting: boolean
  onChange: (form: AuthForm) => void
  onClearAuthError: () => void
  onOpenLegal: (type: 'terms' | 'privacy') => void
  onModeChange: (mode: AuthMode) => void
  onOidcLogin: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  oidcConfig: OidcConfig
}

export function AuthPage({
  authForm,
  authError,
  authMode,
  isSubmitting,
  onChange,
  onClearAuthError,
  onOpenLegal,
  onModeChange,
  onOidcLogin,
  onSubmit,
  oidcConfig,
}: AuthPageProps) {
  const [showLoginPanel, setShowLoginPanel] = useState(() => Boolean(authError || authMode !== 'login'))

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
  const accessGuide =
    authMode === 'company-register'
      ? {
          title: 'Primeiro administrador',
          items: [
            'Cadastre a empresa com um e-mail corporativo válido.',
            'Compartilhe o código de convite apenas com funcionários autorizados.',
            'Depois, defina departamentos, perfis e permissões internas.',
          ],
        }
      : authMode === 'register'
        ? {
            title: 'Cadastro por convite',
            items: [
              'Use o código recebido pelo administrador da empresa.',
              'Seu e-mail precisa pertencer ao ambiente corporativo autorizado.',
              'Após entrar, você verá as decisões da empresa conforme seu perfil.',
            ],
          }
        : {
            title: 'Acesso seguro',
            items: [
              'Entre com e-mail e senha ou use o login institucional disponível.',
              'No primeiro acesso com Google, informe o código de convite da empresa.',
              'As ações importantes ficam registradas para auditoria.',
            ],
          }

  if (!showLoginPanel) {
    return (
      <PresentationPage
        logoSrc={logo}
        onEnter={() => setShowLoginPanel(true)}
        onRegisterCompany={() => {
          setShowLoginPanel(true)
          onModeChange('company-register')
        }}
      />
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
          <div className="login-context-card">
            <strong>{accessGuide.title}</strong>
            <ul>
              {accessGuide.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
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
          {authError && (
            <AccessDeniedNotice
              authMode={authMode}
              message={authError}
              onClear={onClearAuthError}
              onUseInvite={() => {
                onClearAuthError()
                onModeChange('register')
              }}
            />
          )}
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
              <div className="company-invite-field">
                <label htmlFor="companyAccessCode">Código de convite da empresa</label>
                <input
                  id="companyAccessCode"
                  value={authForm.companyAccessCode}
                  onChange={(event) => onChange({ ...authForm, companyAccessCode: event.target.value.toUpperCase() })}
                  placeholder="Ex: DL-AESA01"
                  required
                />
                <small className="field-hint">
                  Solicite este código ao administrador da empresa. Ele confirma que seu acesso pertence ao ambiente correto.
                </small>
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
              <PasswordInput
                id="password"
                label={authMode === 'reset' ? 'Nova senha' : 'Senha'}
                minLength={authMode === 'login' ? undefined : 8}
                pattern={
                  authMode === 'login'
                    ? undefined
                    : '^(?!.*(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210))(?=.*[A-Za-zÀ-ÿ])(?=.*\\d)(?=.*[^A-Za-zÀ-ÿ0-9]).{8,}$'
                }
                title="Use 8 caracteres ou mais, com letra, número, caractere especial e sem sequência numérica."
                value={authForm.password}
                onChange={(password) => onChange({ ...authForm, password })}
                placeholder={authMode === 'login' ? '********' : 'Ex: Decisão@26'}
                required
                hint={
                  authMode !== 'login'
                    ? 'Mínimo 8 caracteres, com letra, número, caractere especial e sem sequência numérica.'
                    : undefined
                }
              />
            )}
            {authMode === 'company-register' && (
              <small className="field-hint">
                O domínio do e-mail do administrador será usado como domínio autorizado da empresa.
              </small>
            )}
            {(authMode === 'register' || authMode === 'company-register') && (
              <LegalConsent authForm={authForm} onChange={onChange} onOpenLegal={onOpenLegal} />
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
              <div className="oidc-invite-panel">
                <strong>Primeiro acesso institucional</strong>
                <p>
                  Se você recebeu um convite da empresa, informe o código antes de entrar com Google.
                  Nos próximos acessos, basta usar sua conta normalmente.
                </p>
                <label htmlFor="oidcCompanyAccessCode">Código de convite</label>
                <div className="oidc-invite-row">
                  <input
                    id="oidcCompanyAccessCode"
                    value={authForm.companyAccessCode}
                    onChange={(event) => onChange({ ...authForm, companyAccessCode: event.target.value.toUpperCase() })}
                    placeholder="Ex: DL-AESA01"
                  />
                  <button className="oidc-button" type="button" onClick={onOidcLogin}>
                    {oidcConfig.providerName}
                  </button>
                </div>
              </div>
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
