import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type User = {
  id: string
  name: string
  email: string
}

type Decision = {
  id: string
  title: string
  context: string
  decision: string
  reason: string
  status: string
  createdAt: string
  user?: User | null
}

type FormState = {
  title: string
  context: string
  decision: string
  reason: string
}

type AuthState = {
  name: string
  email: string
  password: string
}

const emptyForm: FormState = {
  title: '',
  context: '',
  decision: '',
  reason: '',
}

const emptyAuth: AuthState = {
  name: '',
  email: '',
  password: '',
}

const apiUrl = 'http://localhost:3333'

function App() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [authForm, setAuthForm] = useState<AuthState>(emptyAuth)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [token, setToken] = useState(() => localStorage.getItem('decisionlog:token') || '')
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('decisionlog:user')
    return storedUser ? (JSON.parse(storedUser) as User) : null
  })
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  async function loadDecisions(currentToken = token) {
    if (!currentToken) {
      return
    }

    setIsLoading(true)
    const response = await fetch(`${apiUrl}/decisions`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Nao foi possivel carregar as decisoes.')
    }

    const data = (await response.json()) as Decision[]
    setDecisions(data)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    loadDecisions()
      .catch(() => {
        setMessage('Sessao expirada ou API indisponivel. Faca login novamente.')
        handleLogout()
      })
      .finally(() => setIsLoading(false))
  }, [token])

  function updateField(field: keyof FormState, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  function updateAuthField(field: keyof AuthState, value: string) {
    setAuthForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const endpoint = authMode === 'login' ? 'login' : 'register'
      const body =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authForm

      const response = await fetch(`${apiUrl}/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Falha na autenticacao.')
      }

      if (authMode === 'register') {
        setAuthMode('login')
        setAuthForm((currentForm) => ({ ...currentForm, password: '' }))
        setMessage('Usuario cadastrado. Agora faca login.')
        return
      }

      const data = (await response.json()) as { token: string; user: User }
      localStorage.setItem('decisionlog:token', data.token)
      localStorage.setItem('decisionlog:user', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      setAuthForm(emptyAuth)
      setMessage('')
    } catch {
      setMessage('Nao foi possivel autenticar. Confira os dados e a API.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiUrl}/decisions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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

  function handleLogout() {
    localStorage.removeItem('decisionlog:token')
    localStorage.removeItem('decisionlog:user')
    setToken('')
    setUser(null)
    setDecisions([])
  }

  if (!token || !user) {
    return (
      <main className="app-shell auth-shell">
        <section className="panel auth-panel">
          <div className="section-heading">
            <span className="eyebrow">DecisionLog</span>
            <h1>{authMode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
          </div>

          <form onSubmit={handleAuthSubmit} className="decision-form">
            {authMode === 'register' && (
              <label>
                Nome
                <input
                  value={authForm.name}
                  onChange={(event) => updateAuthField('name', event.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </label>
            )}

            <label>
              E-mail
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => updateAuthField('email', event.target.value)}
                placeholder="voce@email.com"
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => updateAuthField('password', event.target.value)}
                placeholder="Minimo de 6 caracteres"
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Aguarde...'
                : authMode === 'login'
                  ? 'Entrar'
                  : 'Cadastrar'}
            </button>
          </form>

          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setAuthMode((currentMode) =>
                currentMode === 'login' ? 'register' : 'login',
              )
              setMessage('')
            }}
          >
            {authMode === 'login' ? 'Criar uma conta' : 'Ja tenho uma conta'}
          </button>

          {message && <p className="status-message">{message}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="panel form-panel">
          <div className="section-heading">
            <span className="eyebrow">DecisionLog</span>
            <h1>Registrar decisao</h1>
            <p className="user-line">Logado como {user.name}</p>
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

          <button className="ghost-button" type="button" onClick={handleLogout}>
            Sair
          </button>

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
                    <div>
                      <dt>Autor</dt>
                      <dd>{item.user?.name || 'Registro anterior ao login'}</dd>
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
