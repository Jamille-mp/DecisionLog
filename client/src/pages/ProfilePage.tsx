import { useRef, useState } from 'react'
import type { FormEvent, PointerEvent } from 'react'
import { Camera, Check, Eye, EyeOff, Image as ImageIcon, Moon, Sun, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { CompanyBadge } from '../components/shared/CompanyBadge'
import { PageHeader } from '../components/shared/PageHeader'
import { ProfileAvatar } from '../components/shared/ProfileAvatar'
import { defaultImageFrameSettings, roleLabels } from '../constants/app'
import type { ImageFrameSettings, ProfileFormData, User } from '../types'
import { formatPhone } from '../utils/format'
import { cropImageToCircleDataUrl, readImageAsDataUrl } from '../utils/image'

type ProfilePageProps = {
  isSubmitting: boolean
  onSave: (data: ProfileFormData) => Promise<void>
  user: User
}

type CropEditorState = {
  field: 'avatarUrl' | 'companyLogoUrl'
  frame: ImageFrameSettings
  name: string
  source: string
  title: string
}

function ProfilePhotoCropDialog({
  frame,
  imageUrl,
  name,
  title,
  onCancel,
  onChange,
  onConfirm,
}: {
  frame: ImageFrameSettings
  imageUrl: string
  name: string
  title: string
  onCancel: () => void
  onChange: (frame: ImageFrameSettings) => void
  onConfirm: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ clientX: number; clientY: number; frameX: number; frameY: number } | null>(null)

  const clampFrame = (value: number) => Math.max(-45, Math.min(45, value))

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      frameX: frame.x,
      frameY: frame.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return

    const { width, height } = event.currentTarget.getBoundingClientRect()
    const deltaX = ((event.clientX - dragStart.current.clientX) / Math.max(width, 1)) * 100
    const deltaY = ((event.clientY - dragStart.current.clientY) / Math.max(height, 1)) * 100

    onChange({
      ...frame,
      x: clampFrame(dragStart.current.frameX + deltaX),
      y: clampFrame(dragStart.current.frameY + deltaY),
    })
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsDragging(false)
  }

  return (
    <div className="profile-crop-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="profile-crop-dialog">
        <div className="profile-crop-header">
          <div>
            <span>Foto de perfil</span>
            <h2>{title}</h2>
          </div>
          <button type="button" aria-label="Cancelar ajuste da foto" onClick={onCancel}>
            <X />
          </button>
        </div>

        <div className="profile-crop-board">
          <div
            className={`profile-crop-viewport${isDragging ? ' dragging' : ''}`.trim()}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            role="application"
          >
          <img
            src={imageUrl}
            alt={`Enquadramento de ${name}`}
            draggable={false}
            style={{ transform: `translate(${frame.x}%, ${frame.y}%) scale(${frame.zoom})` }}
          />
          </div>
        </div>

        <p>Arraste a imagem por trás do círculo fixo até o enquadramento ficar correto.</p>

        <div className="profile-crop-actions">
          <button className="secondary" type="button" onClick={() => onChange(defaultImageFrameSettings)}>
          Centralizar
          </button>
          <button className="secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" onClick={onConfirm}>
            <Check />
            Confirmar foto
          </button>
        </div>
      </section>
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
  const [cropEditor, setCropEditor] = useState<CropEditorState | null>(null)
  const canEditCompanyLogo = user.role === 'admin'

  async function handleImageChange(field: 'avatarUrl' | 'companyLogoUrl', files: FileList | null) {
    const file = files?.[0]
    if (!file) return

    try {
      const imageUrl = await readImageAsDataUrl(file)
      setCropEditor({
        field,
        frame: defaultImageFrameSettings,
        name: field === 'avatarUrl' ? formData.name : user.company?.name || 'Empresa',
        source: imageUrl,
        title: field === 'avatarUrl' ? 'Ajustar foto de perfil' : 'Ajustar foto da empresa',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar a imagem.')
    }
  }

  async function confirmImageCrop() {
    if (!cropEditor) return

    try {
      const croppedImageUrl = await cropImageToCircleDataUrl(cropEditor.source, cropEditor.frame)
      setFormData((current) => ({ ...current, [cropEditor.field]: croppedImageUrl }))
      setCropEditor(null)
      toast.success('Enquadramento confirmado.')
    } catch {
      toast.error('Não foi possível salvar as alterações do perfil.')
    }
  }

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
          <ProfileAvatar className="large" imageUrl={formData.avatarUrl} name={formData.name} />
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
          {user.role === 'admin' && user.company?.accessCode && (
            <div className="company-access-code">
              <span>Código da empresa</span>
              <strong>{user.company.accessCode}</strong>
            </div>
          )}
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
                  imageUrl={formData.avatarUrl}
                  name={formData.name}
                />
                <div className="media-upload-copy">
                  <strong>Foto de perfil</strong>
                  <span>Escolha uma imagem e confirme o enquadramento circular.</span>
                </div>
                <div className="media-upload-actions">
                  <label className="upload-button" htmlFor="profileAvatarUrl">
                    <Camera />
                    Escolher foto
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
                  <label className="upload-button" htmlFor="profileAvatarCamera">
                    <Camera />
                    Usar câmera
                  </label>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    capture="user"
                    className="file-input"
                    id="profileAvatarCamera"
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
      {cropEditor && (
        <ProfilePhotoCropDialog
          frame={cropEditor.frame}
          imageUrl={cropEditor.source}
          name={cropEditor.name}
          title={cropEditor.title}
          onCancel={() => setCropEditor(null)}
          onChange={(frame) => setCropEditor((current) => (current ? { ...current, frame } : current))}
          onConfirm={() => {
            void confirmImageCrop()
          }}
        />
      )}
    </section>
  )
}
