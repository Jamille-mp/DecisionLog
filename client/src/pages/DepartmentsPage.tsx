import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Edit2, Trash2, User as UserIcon, X } from 'lucide-react'
import { DataTable } from '../components/shared/DataTable'
import { PageHeader } from '../components/shared/PageHeader'
import type { Department } from '../types'

type DepartmentsPageProps = {
  departments: Department[]
  onCreate: (name: string) => void
  onDelete: (department: Department) => void
  onRename: (department: Department, name: string) => void
  onToggle: (department: Department) => void
}

export function DepartmentsPage({ departments, onCreate, onDelete, onRename, onToggle }: DepartmentsPageProps) {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')
  const activeDepartments = departments.filter((department) => department.active).length
  const inactiveDepartments = departments.length - activeDepartments
  const linkedUsers = departments.reduce((total, department) => total + (department.userCount ?? department._count?.users ?? 0), 0)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onCreate(name)
    setName('')
  }

  return (
    <section className="page-section">
      <PageHeader
        badge="Estrutura organizacional"
        subtitle="Organize áreas internas e acompanhe quantos usuários e decisões pertencem a cada departamento."
        title="Departamentos"
      />
      <div className="admin-summary-grid">
        <article>
          <span>Departamentos ativos</span>
          <strong>{activeDepartments}</strong>
        </article>
        <article>
          <span>Inativos</span>
          <strong>{inactiveDepartments}</strong>
        </article>
        <article>
          <span>Usuários vinculados</span>
          <strong>{linkedUsers}</strong>
        </article>
      </div>
      <div className="filters-card">
        <form className="compact-form" onSubmit={handleSubmit}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Novo departamento"
            required
          />
          <button type="submit">Adicionar</button>
        </form>
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Usuários</th>
            <th>Decisões</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((department) => (
            <tr key={department.id}>
              <td>
                {editingId === department.id ? (
                  <input
                    className="table-input"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                ) : (
                  department.name
                )}
              </td>
              <td>{department.userCount ?? department._count?.users ?? 0}</td>
              <td>{department.decisionCount ?? department._count?.decisions ?? 0}</td>
              <td>
                <span className={`tag ${department.active ? 'status-concluída' : 'status-inativa'}`}>
                  {department.active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td>
                <div className="action-row">
                  {editingId === department.id ? (
                    <>
                      <button
                        className="gold"
                        type="button"
                        onClick={() => {
                          onRename(department, editingName)
                          setEditingId('')
                        }}
                        title="Salvar nome"
                      >
                        <CheckCircle2 />
                      </button>
                      <button type="button" onClick={() => setEditingId('')} title="Cancelar edição">
                        <X />
                      </button>
                    </>
                  ) : (
                    <button
                      className="gold"
                      type="button"
                      onClick={() => {
                        setEditingId(department.id)
                        setEditingName(department.name)
                      }}
                      title="Renomear"
                    >
                      <Edit2 />
                    </button>
                  )}
                  <button
                    className={department.active ? 'danger' : 'gold'}
                    type="button"
                    onClick={() => onToggle(department)}
                    title={department.active ? 'Inativar' : 'Ativar'}
                  >
                    <UserIcon />
                  </button>
                  <button className="danger" type="button" onClick={() => onDelete(department)} title="Excluir">
                    <Trash2 />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </section>
  )
}
