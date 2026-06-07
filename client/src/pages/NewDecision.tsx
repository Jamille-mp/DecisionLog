import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { emptyDecisionForm } from '../constants/app'
import type { DecisionFormData, DecisionView, Department, RoleLabel } from '../types'

type NewDecisionProps = {
  departments: Department[]
  editingDecision: DecisionView | null
  isSubmitting: boolean
  onCancelEdit: () => void
  onSave: (decision: DecisionFormData) => Promise<void>
  userRole: RoleLabel
}

export function NewDecision({
  departments,
  editingDecision,
  isSubmitting,
  onCancelEdit,
  onSave,
  userRole,
}: NewDecisionProps) {
  const [formData, setFormData] = useState<DecisionFormData>(() =>
    editingDecision
      ? {
          titulo: editingDecision.titulo,
          departamentoId: editingDecision.departamentoId || '',
          departamento: editingDecision.departamento,
          impacto: editingDecision.impacto,
          status: editingDecision.status === 'Concluída' ? 'Concluída' : 'Pendente',
          descricao: editingDecision.source.reason || editingDecision.descricao,
        }
      : emptyDecisionForm,
  )
  const isReadOnly = userRole === 'Auditor'
  const completionItems = [
    { label: 'Título preenchido', done: Boolean(formData.titulo.trim()) },
    { label: 'Contexto descrito', done: Boolean(formData.descricao.trim()) },
    { label: 'Departamento definido', done: Boolean(formData.departamentoId) },
    { label: 'Impacto classificado', done: Boolean(formData.impacto) },
    { label: 'Status informado', done: Boolean(formData.status) },
  ]
  const completedItems = completionItems.filter((item) => item.done).length

  function handleDepartmentChange(departmentId: string) {
    const department = departments.find((item) => item.id === departmentId)
    setFormData({
      ...formData,
      departamentoId: departmentId,
      departamento: department?.name || '',
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSave(formData)
  }

  if (isReadOnly) {
    return (
      <section className="page-section">
        <div className="empty-card">
          <p>Você não tem permissão para criar novas decisões.</p>
          <span>Apenas Administradores e Gestores podem registrar decisões.</span>
        </div>
      </section>
    )
  }

  return (
    <section className="page-section">
      <PageHeader
        badge={editingDecision ? 'Edição controlada' : 'Novo registro'}
        subtitle="Preencha somente o necessário para que a decisão fique clara, rastreável e fácil de consultar."
        title={editingDecision ? 'Editar Decisão' : 'Registrar Nova Decisão'}
      />
      <div className="form-card decision-editor-card">
        <form onSubmit={handleSubmit} className="decision-form">
          <div className="form-section-heading">
            <h2>Dados principais</h2>
            <p>Informe o contexto necessário para que a decisão seja compreendida e auditada futuramente.</p>
          </div>
          <div className="form-grid">
            <div className="full-field">
              <label htmlFor="titulo">Título da Decisão</label>
              <input
                id="titulo"
                value={formData.titulo}
                onChange={(event) => setFormData({ ...formData, titulo: event.target.value })}
                placeholder="Ex: Implementação de novo sistema de controle de estoque"
                required
              />
            </div>
            <div>
              <label htmlFor="departamento">Departamento Responsável</label>
              <select
                id="departamento"
                value={formData.departamentoId}
                onChange={(event) => handleDepartmentChange(event.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Nível de Impacto</label>
              <div className="radio-stack">
                {(['Baixo', 'Médio', 'Alto'] as const).map((impacto) => (
                  <label key={impacto}>
                    <input
                      checked={formData.impacto === impacto}
                      name="impacto"
                      onChange={(event) =>
                        setFormData({ ...formData, impacto: event.target.value as DecisionFormData['impacto'] })
                      }
                      required
                      type="radio"
                      value={impacto}
                    />
                    <span>{impacto}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(event) => setFormData({ ...formData, status: event.target.value as DecisionFormData['status'] })}
                required
              >
                <option value="Pendente">Pendente</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>
            <div className="full-field">
              <div className="form-section-heading compact">
                <h2>Contexto e justificativa</h2>
                <p>Descreva motivo, impacto esperado e ações relacionadas à decisão.</p>
              </div>
              {editingDecision && (
                <p className="form-helper-text">
                  Em registros antigos, contexto e decisão podem existir como campos técnicos separados. Nesta tela, edite somente a descrição visível da decisão.
                </p>
              )}
              <label htmlFor="descricao">Descrição Detalhada</label>
              <textarea
                id="descricao"
                value={formData.descricao}
                onChange={(event) => setFormData({ ...formData, descricao: event.target.value })}
                placeholder="Descreva os detalhes da decisão, contexto, impactos esperados e ações a serem tomadas..."
                required
              />
            </div>
          </div>
          <div className="decision-progress-card">
            <div>
              <strong>Revisão antes de salvar</strong>
              <span>
                {completedItems} de {completionItems.length} campos obrigatórios preenchidos
              </span>
            </div>
            <div className="decision-progress-bar" aria-hidden="true">
              <span style={{ width: `${(completedItems / completionItems.length) * 100}%` }} />
            </div>
            <div className="decision-checklist">
              {completionItems.map((item) => (
                <span className={item.done ? 'done' : ''} key={item.label}>
                  <CheckCircle2 />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="form-actions">
            {editingDecision && (
              <button className="secondary-action" type="button" onClick={onCancelEdit}>
                Cancelar
              </button>
            )}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : editingDecision ? 'Atualizar Decisão' : 'Salvar Decisão'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
