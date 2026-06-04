import { useState } from 'react'
import type { FormEvent } from 'react'
import { Camera, Eye, EyeOff, Image as ImageIcon, Moon, Sun, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { CompanyBadge } from '../components/shared/CompanyBadge'
import { PageHeader } from '../components/shared/PageHeader'
import { ProfileAvatar } from '../components/shared/ProfileAvatar'
import { defaultImageFrameSettings, roleLabels } from '../constants/app'
import type { ImageFrameSettings, ProfileFormData, User } from '../types'
import { formatPhone } from '../utils/format'
import { cropImageToSquareDataUrl, readImageAsDataUrl } from '../utils/image'

type ProfilePageProps = {
  isSubmitting: boolean
  onSave: (data: ProfileFormData) => Promise<void>
  user: User
}

function ImageFrameControls({
  disabled = false,
  frame,
  onChange,
}: {
  disabled?: boolean
  frame: ImageFrameSettings
  onChange: (frame: ImageFrameSettings) => void
}) {
  const updateFrame = (field: keyof ImageFrameSettings, value: number) => {
    onChange({ ...frame, [field]: value })
  }

  return (
    <div className="image-frame-controls" aria-label="Ajuste de enquadramento">
      <label>
        <span>Zoom</span>
        <input
          type="range"
          min="1"
          max="2.4"
          step="0.05"
          value={frame.zoom}
          disabled={disabled}
          onChange={(event) => updateFrame('zoom', Number(event.target.value))}
        />
      </label>
      <label>
        <span>Horizontal</span>
        <input
          type="range"
          min="-45"
          max="45"
          step="1"
          value={frame.x}
          disabled={disabled}
          onChange={(event) => updateFrame('x', Number(event.target.value))}
        />
      </label>
      <label>
        <span>Vertical</span>
        <input
          type="range"
          min="-45"
          max="45"
          step="1"
          value={frame.y}
          disabled={disabled}
          onChange={(event) => updateFrame('y', Number(event.target.value))}
        />
      </label>
      <button type="button" disabled={disabled} onClick={() => onChange(defaultImageFrameSettings)}>
        Centralizar
      </button>
    </div>
  )
}

export function ProfilePage({ isSubmitting, onSave, user }: ProfilePageProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatarUrl: user.avatarUrl || null,
    companyLogoUrl: user.company?.logoUrl || null,
    preferredTheme: user.preferredTheme || 'light',
    currentPassword: '',
    newPassword: '',
  })
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
  })
  const [avatarFrame, setAvatarFrame] = useState<ImageFrameSettings>(defaultImageFrameSettings)
  const [companyLogoFrame, setCompanyLogoFrame] = useState<ImageFrameSettings>(defaultImageFrameSettings)
  const canEditCompanyLogo = user.role === 'admin'

  async function handleImageChange(field: 'avatarUrl' | 'companyLogoUrl', files: FileList | null) {
    const file = files?.[0]
    if (!file) return

    try {
      const imageUrl = await readImageAsDataUrl(file)
      setFormData((current) => ({ ...current, [field]: imageUrl }))
      if (field === 'avatarUrl') {
        setAvatarFrame(defaultImageFrameSettings)
      } else {
        setCompanyLogoFrame(defaultImageFrameSettings)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a imagem.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const framedData: ProfileFormData = {
        ...formData,
        avatarUrl: formData.avatarUrl ? await cropImageToSquareDataUrl(formData.avatarUrl, avatarFrame) : null,
        companyLogoUrl: formData.companyLogoUrl
          ? await cropImageToSquareDataUrl(formData.companyLogoUrl, companyLogoFrame)
          : null,
      }

      await onSave(framedData)
      setFormData((current) => ({
        ...current,
        avatarUrl: framedData.avatarUrl,
        companyLogoUrl: framedData.companyLogoUrl,
      }))
      setAvatarFrame(defaultImageFrameSettings)
      setCompanyLogoFrame(defaultImageFrameSettings)
      setFormData((current) => ({
        ...current,
        currentPassword: '',
        newPassword: '',
      }))
    } catch {
      toast.error('Não foi possível enquadrar a imagem selecionada.')
    }
  }

  function updatePreferredTheme(preferredTheme: ProfileFormData['preferredTheme']) {
    document.body.dataset.theme = preferredTheme
    setFormData((current) => ({ ...current, preferredTheme }))
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
          <ProfileAvatar className="large" frame={avatarFrame} imageUrl={formData.avatarUrl} name={formData.name} />
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <CompanyBadge
            className="profile-company-badge"
            label="Empresa"
            logoUrl={formData.companyLogoUrl}
            name={user.company?.name || 'Empresa'}
          />
          <div className="profile-overview-meta">
            <span>{roleLabels[user.role]}</span>
            <span>{user.department?.name || 'Sem departamento vinculado'}</span>
          </div>
        </aside>

        <div className="profile-settings-stack">
          <section className="profile-panel profile-media-panel">
            <div className="profile-panel-header">
              <h2>Fotos de identificação</h2>
              <p>Personalize sua foto no sistema e a marca exibida para a empresa ativa.</p>
            </div>
            <div className="media-upload-grid">
              <div className="media-upload-item">
                <ProfileAvatar
                  className="large media-preview-avatar"
                  frame={avatarFrame}
                  imageUrl={formData.avatarUrl}
                  name={formData.name}
                />
                <div className="media-upload-copy">
                  <strong>Foto de perfil</strong>
                  <span>PNG, JPG ou WebP até 512 KB.</span>
                </div>
                <ImageFrameControls disabled={!formData.avatarUrl} frame={avatarFrame} onChange={setAvatarFrame} />
                <div className="media-upload-actions">
                  <label className="upload-button" htmlFor="profileAvatarUrl">
                    <Camera />
                    Alterar
                  </label>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="file-input"
                    id="profileAvatarUrl"
                    type="file"
                    onChange={(event) => {
                      const input = event.currentTarget
                      void handleImageChange('avatarUrl', input.files).finally(() => {
                        input.value = ''
                      })
                    }}
                  />
                  {formData.avatarUrl && (
                    <button
                      className="ghost-danger"
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, avatarUrl: null })
                        setAvatarFrame(defaultImageFrameSettings)
                      }}
                    >
                      <Trash2 />
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <div className="media-upload-item">
                <div className="company-photo-preview">
                  {formData.companyLogoUrl ? (
                    <img
                      src={formData.companyLogoUrl}
                      alt={`Logo de ${user.company?.name || 'Empresa'}`}
                      style={{
                        transform: `translate(${companyLogoFrame.x}%, ${companyLogoFrame.y}%) scale(${companyLogoFrame.zoom})`,
                      }}
                    />
                  ) : (
                    <ImageIcon />
                  )}
                </div>
                <div className="media-upload-copy">
                  <strong>Foto da empresa</strong>
                  <span>{user.company?.name || 'Empresa'}</span>
                </div>
                {canEditCompanyLogo ? (
                  <div className="media-upload-actions">
                    <label className="upload-button" htmlFor="companyLogoUrl">
                      <Upload />
                      Alterar
                    </label>
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      className="file-input"
                      id="companyLogoUrl"
                      type="file"
                      onChange={(event) => {
                        const input = event.currentTarget
                        void handleImageChange('companyLogoUrl', input.files).finally(() => {
                          input.value = ''
                        })
                      }}
                    />
                    {formData.companyLogoUrl && (
                      <button
                        className="ghost-danger"
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, companyLogoUrl: null })
                          setCompanyLogoFrame(defaultImageFrameSettings)
                        }}
                      >
                        <Trash2 />
                        Remover
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="media-upload-note">A marca da empresa é gerenciada por administradores.</span>
                )}
                {canEditCompanyLogo && (
                  <ImageFrameControls
                    disabled={!formData.companyLogoUrl}
                    frame={companyLogoFrame}
                    onChange={setCompanyLogoFrame}
                  />
                )}
              </div>
            </div>
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
              <p>Este e-mail é usado no login e na recuperação de senha.</p>
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
