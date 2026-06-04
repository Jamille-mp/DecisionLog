import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { LoadingState } from '../components/shared/LoadingState'
import { PageHeader } from '../components/shared/PageHeader'
import type { DecisionView, Health } from '../types'
import { formatDateTime } from '../utils/format'

export function Dashboard({
  decisions,
  isAdmin,
  isLoading,
  usersCount,
}: {
  decisions: DecisionView[]
  health: Health | null
  isAdmin: boolean
  isLoading: boolean
  usersCount: number
}) {
  const totalDecisions = decisions.length
  const pendingDecisions = decisions.filter((decision) => decision.status === 'Pendente').length
  const completedDecisions = decisions.filter((decision) => decision.status === 'Concluída').length
  const archivedDecisions = decisions.filter((decision) => decision.status === 'Arquivada').length
  const highImpactDecisions = decisions.filter((decision) => decision.impacto === 'Alto').length
  const completionRate = totalDecisions > 0 ? Math.round((completedDecisions / totalDecisions) * 100) : 0
  const departmentData = Object.values(
    decisions.reduce<Record<string, { name: string; decisoes: number }>>((summary, decision) => {
      summary[decision.departamento] ||= { name: decision.departamento, decisoes: 0 }
      summary[decision.departamento].decisoes += 1
      return summary
    }, {}),
  )
  const impactData = [
    { id: 'impact-1', name: 'Alto', value: decisions.filter((item) => item.impacto === 'Alto').length, color: '#DC2626' },
    { id: 'impact-2', name: 'Médio', value: decisions.filter((item) => item.impacto === 'Médio').length, color: '#F59E0B' },
    { id: 'impact-3', name: 'Baixo', value: decisions.filter((item) => item.impacto === 'Baixo').length, color: '#3B82F6' },
  ]
  const fallbackDepartmentData = departmentData.length > 0 ? departmentData : [{ name: 'Sem dados', decisoes: 0 }]
  const fallbackImpactData = impactData.some((item) => item.value > 0)
    ? impactData
    : [{ id: 'empty', name: 'Sem dados', value: 1, color: '#E5E7EB' }]

  function exportDashboardReport() {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão.')
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Indicadores do DecisionLog</title>
          <style>
            body { font-family: Arial, sans-serif; color: #183354; padding: 24px; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            p { color: #4b5563; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; }
            .card span { display: block; color: #6b7280; font-size: 12px; margin-bottom: 6px; }
            .card strong { font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #183354; color: #fff; }
          </style>
        </head>
        <body>
          <h1>Indicadores executivos do DecisionLog</h1>
          <p>Exportado em ${formatDateTime(new Date().toISOString())}</p>
          <div class="grid">
            <div class="card"><span>Total de decisões</span><strong>${totalDecisions}</strong></div>
            <div class="card"><span>Pendentes</span><strong>${pendingDecisions}</strong></div>
            <div class="card"><span>Concluídas</span><strong>${completedDecisions}</strong></div>
            <div class="card"><span>Arquivadas</span><strong>${archivedDecisions}</strong></div>
            <div class="card"><span>Impacto alto</span><strong>${highImpactDecisions}</strong></div>
            <div class="card"><span>Taxa de conclusão</span><strong>${completionRate}%</strong></div>
          </div>
          <h2>Volume por departamento</h2>
          <table>
            <thead><tr><th>Departamento</th><th>Decisões</th></tr></thead>
            <tbody>${departmentData.map((item) => `<tr><td>${item.name}</td><td>${item.decisoes}</td></tr>`).join('')}</tbody>
          </table>
          <h2>Distribuição por impacto</h2>
          <table>
            <thead><tr><th>Impacto</th><th>Total</th></tr></thead>
            <tbody>${impactData.map((item) => `<tr><td>${item.name}</td><td>${item.value}</td></tr>`).join('')}</tbody>
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
        actions={(
          <div className="toolbar-actions">
            <button type="button" onClick={exportDashboardReport}>
              <Download />
              Exportar
            </button>
          </div>
        )}
        badge="Indicadores executivos"
        subtitle="Acompanhe volume, andamento, impacto e distribuição das decisões registradas."
        title="Visão Geral Estratégica"
      />
      <div className="dashboard-guidance">
        <article>
          <span>Prioridade do dia</span>
          <strong>{pendingDecisions > 0 ? 'Resolver decisões pendentes' : 'Manter acompanhamento'}</strong>
          <p>
            {pendingDecisions > 0
              ? `${pendingDecisions} registro(s) ainda exigem análise, validação ou encaminhamento.`
              : 'Não há pendências abertas no momento. Use os gráficos para observar tendências.'}
          </p>
        </article>
        <article>
          <span>Controle executivo</span>
          <strong>{completionRate}% de conclusão</strong>
          <p>Indicador rápido para medir andamento e maturidade do processo decisório.</p>
        </article>
        <article>
          <span>Auditoria preparada</span>
          <strong>{archivedDecisions} registro(s) arquivado(s)</strong>
          <p>Decisões arquivadas continuam disponíveis para consulta e prestação de contas.</p>
        </article>
      </div>
      <div className="kpi-grid">
        <KpiCard icon={FileText} label="Total de Decisões" value={totalDecisions} tone="primary" />
        <KpiCard icon={Clock} label="Decisões Pendentes" value={pendingDecisions} tone="warning" />
        <KpiCard icon={CheckCircle2} label="Decisões Concluídas" value={completedDecisions} tone="success" />
        <KpiCard icon={AlertTriangle} label="Impacto Alto" value={highImpactDecisions} tone="danger" />
        <KpiCard icon={Building2} label="Departamentos" value={departmentData.length} tone="neutral" />
        <KpiCard icon={FolderOpen} label="Arquivadas" value={archivedDecisions} tone="neutral" />
        {isAdmin && <KpiCard icon={Users} label="Usuários Ativos" value={usersCount} tone="primary" />}
      </div>
      {isLoading && <LoadingState label="Carregando indicadores..." />}
      <div className="chart-grid">
        <article className="chart-card">
          <h3>Volume de Decisões por Departamento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fallbackDepartmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis allowDecimals={false} stroke="#6B7280" />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
              <Bar dataKey="decisoes" fill="#183354" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="chart-card">
          <h3>Distribuição por Nível de Impacto</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fallbackImpactData}
                cx="50%"
                cy="50%"
                dataKey="value"
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
                outerRadius={100}
              >
                {fallbackImpactData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileText
  label: string
  value: number
  tone: 'primary' | 'warning' | 'success' | 'danger' | 'neutral'
}) {
  return (
    <article className="kpi-card">
      <div>
        <p>{label}</p>
        <strong className={tone}>{value}</strong>
      </div>
      <div className={`kpi-icon ${tone}`}>
        <Icon />
      </div>
    </article>
  )
}
