import { useState } from 'react'
import { Eye, Trash2, User as UserIcon, X } from 'lucide-react'
import { DataTable } from '../components/shared/DataTable'
import { Detail } from '../components/shared/Detail'
import { PageHeader } from '../components/shared/PageHeader'
import { ProfileAvatar } from '../components/shared/ProfileAvatar'
import { labelToRole, roleLabels } from '../constants/app'
import type { Department, RoleLabel, User } from '../types'
import { formatDateTime } from '../utils/format'

type UsersPageProps = {
  currentUserId?: string
  departments: Department[]
  onDelete: (userId: string) => void
  onUpdate: (userId: string, data: Partial<Pick<User, 'role' | 'active' | 'departmentId'>>) => void
  users: User[]
}

export function UsersPage({ currentUserId, departments, onDelete, onUpdate, users }: UsersPageProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const activeUsers = users.filter((item) => item.active).length
  const admins = users.filter((item) => item.role === 'admin').length
  const unassignedUsers = users.filter((item) => !item.departmentId).length

  return (
    <section className="page-section">
      <PageHeader
        badge="Administração"
        subtitle="Gerencie perfis, departamentos, status de acesso e dados de contato dos colaboradores."
        title="Usuários e Permissões"
      />
      <div className="admin-summary-grid">
        <article>
          <span>Usuários ativos</span>
          <strong>{activeUsers}</strong>
        </article>
        <article>
          <span>Administradores</span>
          <strong>{admins}</strong>
        </article>
        <article>
          <span>Sem departamento</span>
          <strong>{unassignedUsers}</strong>
        </article>
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Perfil</th>
            <th>Status</th>
            <th>Entrada</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>
                <span className="tag status-pendente">{roleLabels[item.role]}</span>
              </td>
              <td>
                <span className={`tag ${item.active ? 'status-concluída' : 'status-inativa'}`}>
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td>{formatDateTime(item.createdAt)}</td>
              <td>
                <div className="action-row">
                  <button type="button" onClick={() => setSelectedUser(item)} title="Ver detalhes">
                    <Eye />
                  </button>
                  <button
                    className={item.active ? 'danger' : 'gold'}
                    disabled={item.id === currentUserId}
                    type="button"
                    onClick={() => onUpdate(item.id, { active: !item.active })}
                    title={item.active ? 'Desativar' : 'Ativar'}
                  >
                    <UserIcon />
                  </button>
                  <button
                    className="danger"
                    disabled={item.id === currentUserId}
                    type="button"
                    onClick={() => onDelete(item.id)}
                    title="Excluir"
                  >
                    <Trash2 />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {selectedUser && (
        <UserDetailsModal
          departments={departments}
          onClose={() => setSelectedUser(null)}
          onUpdate={onUpdate}
          user={selectedUser}
        />
      )}
    </section>
  )
}

function UserDetailsModal({
  departments,
  onClose,
  onUpdate,
  user,
}: {
  departments: Department[]
  onClose: () => void
  onUpdate: (userId: string, data: Partial<Pick<User, 'role' | 'active' | 'departmentId'>>) => void
  user: User
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card user-modal">
        <div className="modal-header">
          <h2>Detalhes do funcionário</h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-content">
          <div className="user-detail-header">
            <ProfileAvatar className="large" imageUrl={user.avatarUrl} name={user.name} />
            <div>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </div>
          </div>
          <div className="detail-grid">
            <Detail label="Contato" value={user.phone || 'Não informado'} />
            <Detail label="Departamento" value={user.department?.name || 'Não vinculado'} />
            <Detail label="Data de entrada" value={formatDateTime(user.createdAt)} />
            <Detail label="Status" value={user.active ? 'Ativo' : 'Inativo'} />
          </div>
          <div className="form-grid user-admin-grid">
            <div>
              <label>Perfil</label>
              <select
                className="table-select"
                value={roleLabels[user.role]}
                onChange={(event) => onUpdate(user.id, { role: labelToRole[event.target.value as RoleLabel] })}
              >
                <option>Administrador</option>
                <option>Gestor</option>
                <option>Auditor</option>
              </select>
            </div>
            <div>
              <label>Departamento</label>
              <select
                className="table-select"
                value={user.departmentId || ''}
                onChange={(event) => onUpdate(user.id, { departmentId: event.target.value || null })}
              >
                <option value="">Não vinculado</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
