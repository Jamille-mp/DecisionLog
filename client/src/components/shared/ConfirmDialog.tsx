import { AlertTriangle, X } from 'lucide-react'

export type ConfirmDialogState = {
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  tone?: 'danger' | 'warning'
  details?: string
  onConfirm: () => void | Promise<void>
}

type ConfirmDialogProps = {
  state: ConfirmDialogState | null
  onClose: () => void
}

export function ConfirmDialog({ state, onClose }: ConfirmDialogProps) {
  if (!state) return null
  const dialog = state

  async function handleConfirm() {
    await dialog.onConfirm()
    onClose()
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className={`modal-card confirm-dialog confirm-${dialog.tone || 'warning'}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="confirm-dialog-header">
          <span>
            <AlertTriangle />
          </span>
          <button aria-label="Fechar confirmação" type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="confirm-dialog-body">
          <h2>{dialog.title}</h2>
          <p>{dialog.description}</p>
          {dialog.details && <small>{dialog.details}</small>}
        </div>
        <div className="confirm-dialog-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            {dialog.cancelLabel || 'Cancelar'}
          </button>
          <button className={dialog.tone === 'danger' ? 'danger-action' : 'warning-action'} type="button" onClick={handleConfirm}>
            {dialog.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
