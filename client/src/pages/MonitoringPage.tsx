import { useCallback, useEffect, useState } from 'react'
import { Activity, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../components/shared/PageHeader'
import { apiUrl } from '../config/app'
import { authHeaders } from '../services/http'
import type { AuditLog, Health } from '../types'
import { formatDateTime } from '../utils/format'

type MonitoringPageProps = {
  auditLogs: AuditLog[]
  health: Health | null
  token: string
}

export function MonitoringPage({ auditLogs, health, token }: MonitoringPageProps) {
  const [liveHealth, setLiveHealth] = useState<Health | null>(health)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [responseMs, setResponseMs] = useState<number | null>(null)
  const recentEventCount = auditLogs.length
  const currentHealth = liveHealth || health
  const checks = currentHealth?.checks
  const unhealthyServices = [
    checks?.mysql !== 'ok' ? 'MySQL' : '',
    checks?.mongodb !== 'ok' ? 'MongoDB' : '',
    checks?.events.state && checks.events.state !== 'closed' ? 'Mensageria' : '',
  ].filter(Boolean)
  const operationalMessage = !currentHealth
    ? 'Aguardando leitura do health check.'
    : unhealthyServices.length === 0
      ? 'Todos os componentes essenciais responderam sem alerta.'
      : `Atenção em: ${unhealthyServices.join(', ')}.`
  const eventState = checks?.events.state || 'unknown'
  const eventFailureCount = checks?.events.failureCount ?? 0

  const refreshHealth = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const startedAt = performance.now()
      const response = await fetch(`${apiUrl}/health`, {
        headers: token ? authHeaders(token) : undefined,
      })
      const payload = (await response.json()) as Health
      setResponseMs(Math.round(performance.now() - startedAt))
      setLiveHealth(payload)
      setLastCheckedAt(new Date())
      if (!response.ok) {
        toast.warning('Health check respondeu com alerta. Veja os detalhes do monitoramento.')
      }
    } catch {
      toast.error('Não foi possível atualizar o monitoramento.')
    } finally {
      setIsRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    window.setTimeout(() => {
      void refreshHealth()
    }, 0)
    const interval = window.setInterval(() => {
      void refreshHealth()
    }, 15_000)

    return () => window.clearInterval(interval)
  }, [refreshHealth])

  return (
    <section className="page-section">
      <PageHeader
        actions={
          <div className="toolbar-actions">
            <span className={`health-pill ${currentHealth?.status === 'ok' ? 'ok' : 'degraded'}`}>
              <Activity />
              API {currentHealth?.status === 'ok' ? 'saudável' : 'com atenção'}
            </span>
            <button type="button" onClick={refreshHealth} disabled={isRefreshing}>
              <RotateCcw />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        }
        subtitle="Painel técnico para administradores acompanharem API, bancos, mensageria e logs recentes."
        title="Monitoramento do Sistema"
      />
      <div className="monitor-summary">
        <div>
          <strong>Estado atual</strong>
          <p>{operationalMessage}</p>
        </div>
        <div>
          <span>
            Última leitura: {lastCheckedAt ? formatDateTime(lastCheckedAt.toISOString()) : 'aguardando primeira leitura'}
          </span>
          <span>Tempo de resposta: {responseMs !== null ? `${responseMs} ms` : 'não medido'}</span>
          <span>Atualização automática: 15s</span>
        </div>
      </div>
      <div className="monitor-grid monitor-grid-operational">
        <article className={`monitor-card ${currentHealth?.status === 'ok' ? 'ok' : 'attention'}`}>
          <span>API REST</span>
          <strong>{currentHealth?.service || 'DecisionLog API'}</strong>
          <p>Status HTTP: {currentHealth?.status || 'sem leitura'} | Endpoint: /health</p>
        </article>
        <article className={`monitor-card ${checks?.mysql === 'ok' ? 'ok' : 'attention'}`}>
          <span>Banco relacional</span>
          <strong>MySQL {checks?.mysql || 'unknown'}</strong>
          <p>Login, usuários, departamentos, decisões e permissões dependem deste serviço.</p>
        </article>
        <article className={`monitor-card ${checks?.mongodb === 'ok' ? 'ok' : 'attention'}`}>
          <span>Auditoria NoSQL</span>
          <strong>MongoDB {checks?.mongodb || 'unknown'}</strong>
          <p>Responsável pelos logs flexíveis de auditoria e alterações importantes.</p>
        </article>
        <article className={`monitor-card ${eventState === 'closed' ? 'ok' : 'attention'}`}>
          <span>Mensageria e circuit breaker</span>
          <strong>
            {checks?.events.mode || 'memory'} / {eventState}
          </strong>
          <p>
            {eventFailureCount} falha(s) consecutiva(s) | {checks?.events.publishedEvents || 0} evento(s)
            publicados.
          </p>
        </article>
      </div>
      <div className="monitor-operations">
        <article>
          <h3>Checklist operacional</h3>
          <div className="operation-list">
            <span className={currentHealth?.status === 'ok' ? 'ok' : 'attention'}>
              API: {currentHealth ? 'endpoint respondeu' : 'sem resposta registrada'}
            </span>
            <span className={checks?.mysql === 'ok' ? 'ok' : 'attention'}>
              MySQL: {checks?.mysql === 'ok' ? 'persistência principal disponível' : 'verificar serviço, credenciais ou DATABASE_URL'}
            </span>
            <span className={checks?.mongodb === 'ok' ? 'ok' : 'attention'}>
              MongoDB: {checks?.mongodb === 'ok' ? 'auditoria disponível' : 'logs podem não ser gravados'}
            </span>
            <span className={eventState === 'closed' ? 'ok' : 'attention'}>
              Eventos: {eventState === 'closed' ? 'circuit breaker fechado' : `circuit breaker em estado ${eventState}`}
            </span>
          </div>
        </article>
        <article>
          <h3>Ações para apresentação</h3>
          <ul>
            <li>Antes de demonstrar, clique em Atualizar e confirme se API e MySQL responderam.</li>
            <li>Se MongoDB estiver em alerta, explique que o sistema principal continua e a auditoria fica limitada.</li>
            <li>Se eventos estiverem em alerta, valide o RabbitMQ ou use o modo em memória para demonstração local.</li>
          </ul>
        </article>
      </div>
      <div className="technical-grid">
        <article>
          <h3>Leitura bruta do /health</h3>
          <pre>{JSON.stringify(currentHealth, null, 2)}</pre>
        </article>
        <article>
          <h3>Interpretação operacional</h3>
          <ul>
            <li>API responde quando o endpoint retorna status `ok`.</li>
            <li>MySQL precisa estar `ok` para autenticação, usuários, departamentos e decisões.</li>
            <li>MongoDB precisa estar `ok` para trilhas de auditoria.</li>
            <li>Circuit breaker `closed` indica que a mensageria está liberada.</li>
            <li>Falhas consecutivas aumentam `failureCount`; em limite crítico, o circuito abre.</li>
            <li>Eventos de auditoria carregados no painel: {recentEventCount}.</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
