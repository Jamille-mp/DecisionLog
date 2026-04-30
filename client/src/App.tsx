import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Decision = {
  id: string
  title: string
  context: string
  decision: string
  reason: string
  status: string
  createdAt: string
}

type FormState = {
  title: string
  context: string
  decision: string
  reason: string
}

const emptyForm: FormState = {
  title: '',
  context: '',
  decision: '',
  reason: '',
}

const apiUrl = 'http://localhost:3333'

function App() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function loadDecisions() {
    const response = await fetch(`${apiUrl}/decisions`)

    if (!response.ok) {
      throw new Error('Nao foi possivel carregar as decisoes.')
    }

    const data = (await response.json()) as Decision[]
    setDecisions(data)
  }

  useEffect(() => {
    loadDecisions()
      .catch(() => setMessage('Nao foi possivel conectar com a API.'))
      .finally(() => setIsLoading(false))
  }, [])

  function updateField(field: keyof FormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiUrl}/decisions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        throw new Error('Nao foi possivel salvar a decisao.')
      }

      const createdDecision = (await response.json()) as Decision
      setDecisions((currentDecisions) => [createdDecision, ...currentDecisions])
      setForm(emptyForm)
      setMessage('Decisao registrada com sucesso.')
    } catch {
      setMessage('Erro ao salvar. Confira se o backend esta rodando.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="panel form-panel">
          <div className="section-heading">
            <span className="eyebrow">DecisionLog</span>
            <h1>Registrar decisao</h1>
          </div>

          <form onSubmit={handleSubmit} className="decision-form">
            <label>
              Titulo
              <input
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="Ex: Escolha do banco de dados"
                required
              />
            </label>

            <label>
              Contexto
              <textarea
                value={form.context}
                onChange={(event) => updateField('context', event.target.value)}
                placeholder="Cenario, restricoes, pessoas envolvidas..."
                required
              />
            </label>

            <label>
              Decisao
              <textarea
                value={form.decision}
                onChange={(event) => updateField('decision', event.target.value)}
                placeholder="Qual foi a escolha feita?"
                required
              />
            </label>

            <label>
              Motivo
              <textarea
                value={form.reason}
                onChange={(event) => updateField('reason', event.target.value)}
                placeholder="Por que essa escolha faz sentido?"
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar decisao'}
            </button>
          </form>

          {message && <p className="status-message">{message}</p>}
        </aside>

        <section className="panel list-panel">
          <div className="section-heading">
            <span className="eyebrow">Historico</span>
            <h2>Decisoes registradas</h2>
          </div>

          {isLoading ? (
            <p className="empty-state">Carregando registros...</p>
          ) : decisions.length === 0 ? (
            <p className="empty-state">Nenhuma decisao registrada ainda.</p>
          ) : (
            <div className="decision-list">
              {decisions.map((item) => (
                <article className="decision-card" key={item.id}>
                  <div className="card-header">
                    <h3>{item.title}</h3>
                    <span>{item.status}</span>
                  </div>
                  <p>{item.decision}</p>
                  <dl>
                    <div>
                      <dt>Contexto</dt>
                      <dd>{item.context}</dd>
                    </div>
                    <div>
                      <dt>Motivo</dt>
                      <dd>{item.reason}</dd>
                    </div>
                  </dl>
                  <time dateTime={item.createdAt}>
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    }).format(new Date(item.createdAt))}
                  </time>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
