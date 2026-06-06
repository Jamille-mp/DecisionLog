import { useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, Copy, Eye, EyeOff, Link, Moon, ShieldCheck, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { CompanyBadge } from '../components/shared/CompanyBadge'
import { PageHeader } from '../components/shared/PageHeader'
import { ProfileAvatar } from '../components/shared/ProfileAvatar'
import { roleLabels } from '../constants/app'
import type { ProfileFormData, User } from '../types'
import { formatPhone } from '../utils/format'

type ProfilePageProps = {
  isSubmitting: boolean
  onSave: (data: ProfileFormData) => Promise<void>
  user: User
}

export function ProfilePage({ isSubmitting, onSave, user }: ProfilePageProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    companyName: user.company?.name || '',
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    preferredTheme: user.preferredTheme || 'light',
    currentPassword: '',
    newPassword: '',
  })
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await onSave(formData)
      setFormData((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
      }))
    } catch {
      toast.error('Não foi possível atualizar o perfil.')
    }
  }

  function updatePreferredTheme(preferredTheme: ProfileFormData['preferredTheme']) {
    document.body.dataset.theme = preferredTheme
    setFormData((current) => ({ ...current, preferredTheme }))
  }

  async function copyToClipboard(value: string, successMessage: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = value
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      toast.success(successMessage)
    } catch {
      toast.error('Não foi possível copiar automaticamente.')
    }
  }

  function buildInviteLink(accessCode: string) {
    return `${window.location.origin}${window.location.pathname}?convite=${encodeURIComponent(accessCode)}`
  }

  return (
    <section className="page-section">
      <PageHeader
        badge={roleLabels[user.role]}
        subtitle="Atualize seus dados de contato, e-mail, senha e preferências de visualização."
        title="Meu Perfil"
      />
      <form className="profile-settings-layout" onSubmit={handleSubmit}>
        <aside className="profile-overview">
          <ProfileAvatar className="large" name={formData.name} />
          <div>
            <h2>{formData.name}</h2>
            <p>{formData.email}</p>
          </div>
          <CompanyBadge
            className="profile-company-badge"
            label="Empresa"
            name={user.company?.name || 'Empresa'}
          />
          <div className="profile-overview-meta">
            <span>{roleLabels[user.role]}</span>
            <span>{user.department?.name || 'Sem departamento vinculado'}</span>
          </div>
          {user.role === 'admin' && user.company?.accessCode && (
            <div className="company-access-code">
              <span>Código de convite da empresa</span>
              <strong>{user.company.accessCode}</strong>
              <small>Compartilhe este código apenas com funcionários autorizados no primeiro acesso.</small>
              <div className="company-access-actions">
                <button
                  type="button"
                  onClick={() => {
                    void copyToClipboard(user.company?.accessCode || '', 'Código de convite copiado.')
                  }}
                >
                  <Copy />
                  Copiar código
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copyToClipboard(buildInviteLink(user.company?.accessCode || ''), 'Link de convite copiado.')
                  }}
                >
                  <Link />
                  Copiar link
                </button>
              </div>
            </div>
          )}
        </aside>

        <div className="profile-settings-stack">
          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>Identificação do usuário</h2>
              <p>
                A plataforma usa as iniciais do nome como avatar. Isso evita imagens inadequadas e mantém a
                identificação visual simples em todo o sistema.
              </p>
            </div>
            <div className="profile-initials-preview">
              <ProfileAvatar className="large" name={formData.name} />
              <div>
                <strong>{formData.name || 'Usuário'}</strong>
                <span>{roleLabels[user.role]} · {user.department?.name || 'Sem departamento'}</span>
              </div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>Empresa vinculada</h2>
              <p>Este é o ambiente corporativo em que seu usuário está conectado.</p>
            </div>
            <div className="company-profile-card">
              <div className="company-profile-mark">
                <Building2 />
              </div>
              <div>
                <span>Ambiente atual</span>
                <strong>{formData.companyName || user.company?.name || 'Empresa'}</strong>
                <p>{user.company?.slug ? `Identificador interno: ${user.company.slug}` : 'Empresa vinculada ao seu acesso.'}</p>
              </div>
              <div className="company-profile-status">
                <ShieldCheck />
                <span>{user.role === 'admin' ? 'Perfil administrador da empresa' : 'Perfil vinculado à empresa'}</span>
              </div>
            </div>
            {user.role === 'admin' && (
              <div>
                <label htmlFor="companyNameEdit">Nome visível da empresa</label>
                <input
                  id="companyNameEdit"
                  value={formData.companyName}
                  onChange={(event) => setFormData({ ...formData, companyName: event.target.value })}
                  placeholder="Nome da empresa"
                  required
                />
                <small className="field-hint">
                  Este nome aparece para todos os usuários vinculados a esta empresa.
                </small>
              </div>
            )}
          </section>

          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>Informações de contato</h2>
              <p>Dados visíveis para administradores e usados para identificar responsáveis por decisões.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="profileName">Nome</label>
                <input
                  id="profileName"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="profilePhone">Contato</label>
                <input
                  id="profilePhone"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: formatPhone(event.target.value) })}
                  inputMode="tel"
                  maxLength={15}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label>Departamento</label>
                <input value={user.department?.name || 'Não vinculado'} disabled />
              </div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>E-mail de acesso</h2>
              <p>Este e-mail é usado no login, na recuperação de senha e no vínculo com a empresa.</p>
            </div>
            <div>
              <label htmlFor="profileEmail">E-mail</label>
              <input
                id="profileEmail"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                required
              />
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>Alterar senha</h2>
              <p>Preencha os campos abaixo apenas quando quiser trocar a senha.</p>
            </div>
            <div className="form-grid">
              <div>
                <label htmlFor="currentPassword">Senha atual</label>
                <div className="password-field">
                  <input
                    id="currentPassword"
                    type={visiblePasswords.current ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(event) => setFormData({ ...formData, currentPassword: event.target.value })}
                    placeholder="Senha usada atualmente"
                  />
                  <button
                    type="button"
                    onClick={() => setVisiblePasswords((current) => ({ ...current, current: !current.current }))}
                    aria-label={visiblePasswords.current ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                  >
                    {visiblePasswords.current ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="newPassword">Nova senha</label>
                <div className="password-field">
                  <input
                    id="newPassword"
                    type={visiblePasswords.next ? 'text' : 'password'}
                    minLength={8}
                    pattern="^(?!.*(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210))(?=.*[A-Za-zÀ-ÿ])(?=.*\d)(?=.*[^A-Za-zÀ-ÿ0-9]).{8,}$"
                    title="Use 8 caracteres ou mais, com letra, número, caractere especial e sem sequência numérica."
                    value={formData.newPassword}
                    onChange={(event) => setFormData({ ...formData, newPassword: event.target.value })}
                    placeholder="Ex: Decisão@26"
                  />
                  <button
                    type="button"
                    onClick={() => setVisiblePasswords((current) => ({ ...current, next: !current.next }))}
                    aria-label={visiblePasswords.next ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  >
                    {visiblePasswords.next ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <small className="field-hint">
                  Mínimo 8 caracteres, com letra, número, caractere especial e sem sequência numérica.
                </small>
              </div>
            </div>
          </section>

          <section className="profile-panel">
            <div className="profile-panel-header">
              <h2>Preferências de visualização</h2>
              <p>Escolha como deseja visualizar a plataforma neste navegador.</p>
            </div>
            <div className="theme-toggle">
              <button
                className={formData.preferredTheme === 'light' ? 'active' : ''}
                type="button"
                onClick={() => updatePreferredTheme('light')}
              >
                <Sun />
                Claro
              </button>
              <button
                className={formData.preferredTheme === 'dark' ? 'active' : ''}
                type="button"
                onClick={() => updatePreferredTheme('dark')}
              >
                <Moon />
                Escuro
              </button>
            </div>
          </section>

          <section className="profile-panel profile-consent-panel">
            <div className="profile-summary">
              <span>Termos aceitos no cadastro</span>
              <span>Política de privacidade aceita no cadastro</span>
            </div>
          </section>

          <section className="profile-save-panel">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </section>
        </div>
      </form>
    </section>
  )
}
