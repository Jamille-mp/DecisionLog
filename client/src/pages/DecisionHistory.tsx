import { useState } from 'react'
import { Download, Edit2, Eye, FileText, FolderOpen, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '../components/shared/DataTable'
import { PageHeader } from '../components/shared/PageHeader'
import type { DecisionView, RoleLabel } from '../types'
import { formatDateTime, toIsoDateFromBrazilianDate } from '../utils/format'

type DecisionHistoryProps = {
  decisions: DecisionView[]
  currentUserId?: string
  userRole: RoleLabel
  onArchive: (decision: DecisionView) => void
  onEdit: (decision: DecisionView) => void
  onDelete: (id: string) => void
  onView: (decision: DecisionView) => void
}

export function DecisionHistory({
  decisions,
  currentUserId,
  userRole,
  onArchive,
  onEdit,
  onDelete,
  onView,
}: DecisionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [impactFilter, setImpactFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const canCreateOrEdit = userRole === 'Administrador' || userRole === 'Gestor'
  const departments = Array.from(new Set(decisions.map((decision) => decision.departamento))).sort()
  const hasFilters = Boolean(searchTerm || statusFilter || impactFilter || departmentFilter || dateFromFilter || dateToFilter)
  const filteredDecisions = decisions.filter((decision) => {
    const decisionDate = toIsoDateFromBrazilianDate(decision.data)

    return (
      (decision.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        decision.departamento.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!statusFilter || decision.status === statusFilter) &&
      (!impactFilter || decision.impacto === impactFilter) &&
      (!departmentFilter || decision.departamento === departmentFilter) &&
      (!dateFromFilter || decisionDate >= dateFromFilter) &&
      (!dateToFilter || decisionDate <= dateToFilter)
    )
  })

  function clearFilters() {
    setSearchTerm('')
    setStatusFilter('')
    setImpactFilter('')
    setDepartmentFilter('')
    setDateFromFilter('')
    setDateToFilter('')
  }

  function exportCsv() {
    const headers = ['ID', 'Título', 'Departamento', 'Impacto', 'Status', 'Data', 'Autor']
    const rows = filteredDecisions.map((decision) => [
      decision.id,
      decision.titulo,
      decision.departamento,
      decision.impacto,
      decision.status,
      decision.data,
      decision.autor,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'historico-decisoes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportPdf() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão.')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Histórico de Decisões</title>
          <style>
            body { font-family: Arial, sans-serif; color: #183354; padding: 24px; }
            h1 { font-size: 22px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #183354; color: #fff; }
          </style>
        </head>
        <body>
          <h1>Histórico de Decisões</h1>
          <p>Exportado em ${formatDateTime(new Date().toISOString())}</p>
          <table>
            <thead><tr><th>ID</th><th>Título</th><th>Departamento</th><th>Impacto</th><th>Status</th><th>Data</th><th>Autor</th></tr></thead>
            <tbody>
              ${filteredDecisions.map((decision) => `
                <tr>
                  <td>${decision.id}</td>
                  <td>${decision.titulo}</td>
                  <td>${decision.departamento}</td>
                  <td>${decision.impacto}</td>
                  <td>${decision.status}</td>
                  <td>${decision.data}</td>
                  <td>${decision.autor}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <section className="page-section">
      <PageHeader
        actions={
          <div className="toolbar-actions">
            <button type="button" onClick={() => setIsExportModalOpen(true)}>
              <Download />
              Exportar
            </button>
          </div>
        }
        subtitle="Consulte, filtre, visualize detalhes e exporte registros para análise ou prestação de contas."
        title="Histórico de Decisões"
      />
      {isExportModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card export-modal">
            <div className="modal-header">
              <h2>Exportar histórico</h2>
              <button type="button" onClick={() => setIsExportModalOpen(false)}>
                <X />
              </button>
            </div>
            <div className="export-options">
              <button
                type="button"
                onClick={() => {
                  exportCsv()
                  setIsExportModalOpen(false)
                }}
              >
                <FileText />
                <span>
                  <strong>Arquivo CSV</strong>
                  <small>Planilha com os registros filtrados para análise externa.</small>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportPdf()
                  setIsExportModalOpen(false)
                }}
              >
                <Download />
                <span>
                  <strong>Relatório PDF</strong>
                  <small>Abre a impressão do navegador com a tabela atual.</small>
                </span>
              </button>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setIsExportModalOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="filters-card">
        <div className="filters-card-header">
          <div>
            <strong>Localizar registros</strong>
            <span>
              {filteredDecisions.length} de {decisions.length} decisões exibidas
            </span>
          </div>
          {hasFilters && <span className="filter-status">Filtros aplicados</span>}
        </div>
        <div className="search-wrap">
          <Search />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar decisão..."
            type="text"
          />
        </div>
        <div className="filter-grid">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos os status</option>
            <option value="Pendente">Pendente</option>
            <option value="Concluída">Concluída</option>
            <option value="Arquivada">Arquivada</option>
            <option value="Inativa">Inativa</option>
          </select>
          <select value={impactFilter} onChange={(event) => setImpactFilter(event.target.value)}>
            <option value="">Todos os impactos</option>
            <option value="Baixo">Baixo</option>
            <option value="Médio">Médio</option>
            <option value="Alto">Alto</option>
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="">Todos os departamentos</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <label className="date-filter">
            <span>De</span>
            <input type="date" value={dateFromFilter} onChange={(event) => setDateFromFilter(event.target.value)} />
          </label>
          <label className="date-filter">
            <span>Até</span>
            <input type="date" value={dateToFilter} onChange={(event) => setDateToFilter(event.target.value)} />
          </label>
        </div>
        {hasFilters && (
          <button className="clear-filters" type="button" onClick={clearFilters}>
            <RotateCcw />
            Limpar filtros
          </button>
        )}
      </div>
      <DataTable>
        <thead>
          <tr>
            <th>ID</th>
            <th>Título</th>
            <th>Departamento</th>
            <th>Impacto</th>
            <th>Status</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredDecisions.length === 0 ? (
            <tr>
              <td colSpan={7}>Nenhuma decisão encontrada</td>
            </tr>
          ) : (
            filteredDecisions.map((decision) => (
              <tr key={decision.id}>
                <td>#{decision.id.slice(0, 8)}</td>
                <td>{decision.titulo}</td>
                <td>{decision.departamento}</td>
                <td>
                  <span className={`tag impact-${decision.impacto.toLowerCase()}`}>{decision.impacto}</span>
                </td>
                <td>
                  <span className={`tag status-${decision.status.toLowerCase()}`}>{decision.status}</span>
                </td>
                <td>{decision.data}</td>
                <td>
                  <div className="action-row">
                    <button type="button" onClick={() => onView(decision)} title="Visualizar">
                      <Eye />
                    </button>
                    {canCreateOrEdit && (
                      <>
                        {(userRole === 'Administrador' || decision.source.user?.id === currentUserId) && (
                          <button className="gold" type="button" onClick={() => onEdit(decision)} title="Editar">
                            <Edit2 />
                          </button>
                        )}
                        {decision.status !== 'Inativa' && (
                          <button
                            className="gold"
                            type="button"
                            onClick={() => onArchive(decision)}
                            title={decision.status === 'Arquivada' ? 'Desarquivar decisão' : 'Arquivar decisão'}
                          >
                            <FolderOpen />
                          </button>
                        )}
                        {(userRole === 'Administrador' || decision.source.user?.id === currentUserId) && (
                          <button className="danger" type="button" onClick={() => onDelete(decision.id)} title="Inativar">
                            <Trash2 />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </section>
  )
}
