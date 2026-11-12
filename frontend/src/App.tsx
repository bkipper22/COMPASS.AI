
import { useEffect, useState } from 'react'
import './App.css'

type ChangeRecord = {
  field: string
  previousValue: string
  newValue: string
  date: string
  reason?: string
}

type Solicitation = {
  id: number
  title: string
  description: string
  category: string
  priority: string
  department: string
  reason: string
  recommendation?: {
  available: boolean
  message?: string
  organization: string | null
  service: string | null
  url: string | null
  instructions: string | null
  source: string | null
}
  status: string
  cancellationReason?: string
  history: ChangeRecord[]
}

function App() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const [requests, setRequests] = useState<Solicitation[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const [cancellingRequestId, setCancellingRequestId] = useState<number | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')

  // Carrega as solicitações cadastradas
  useEffect(() => {
    async function loadRequests() {
      try {
        const response = await fetch('http://localhost:3001/solicitacoes')

        if (!response.ok) {
          throw new Error('Não foi possível carregar as solicitações.')
        }

        const data: Solicitation[] = await response.json()

        const normalizedData = data.map((request) => ({
          ...request,
          category: request.category || 'Outros',
          priority: request.priority || 'Baixa',
          department: request.department || 'Triagem geral',
          reason: request.reason || 'Solicitação aguardando avaliação complementar.',
          history: request.history ?? [],
        }))

        setRequests(normalizedData)

      } catch (error) {
        console.error(error)
        alert('Erro ao carregar as solicitações do servidor.')
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [])

  // Cadastra uma nova solicitação com análise da IA
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (analyzing || !title.trim() || !description.trim()) {
      return
    }

    setAnalyzing(true)

    try {
      const aiResponse = await fetch('http://localhost:3001/analisar-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
        }),
      })

      if (!aiResponse.ok) {
        throw new Error('Não foi possível analisar a solicitação com IA.')
      }

      const aiData = await aiResponse.json()

      if (!aiData.success || !aiData.analise) {
        throw new Error('A IA não retornou uma análise válida.')
      }

      const classification = aiData.analise

      const response = await fetch('http://localhost:3001/solicitacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          ...classification,
        }),
      })

      if (!response.ok) {
        throw new Error('Não foi possível registrar a solicitação.')
      }

      const data = await response.json()

      const newRequest: Solicitation = data.solicitacao

      setRequests((current) => [...current, newRequest])
      setTitle('')
      setDescription('')

      alert('Solicitação analisada pela IA e registrada com sucesso!')

    } catch (error) {
      console.error('Erro ao registrar solicitação:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'Erro ao conectar com o servidor.'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  // Atualiza categoria, prioridade ou setor responsável
  async function updateRequest(
    id: number,
    field: 'category' | 'priority' | 'department',
    value: string
  ) {
    const request = requests.find((item) => item.id === id)

    if (!request || request.status === 'Aprovada' || request.status === 'Cancelada') {
      return
    }

    const previousValue = request[field]

    if (previousValue === value) return

    const change: ChangeRecord = {
      field: field,
      previousValue: previousValue,
      newValue: value,
      date: new Date().toLocaleString('pt-BR'),
    }

    const updatedHistory = [...request.history, change]

    try {
      const response = await fetch(
        `http://localhost:3001/solicitacoes/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            [field]: value,
            history: updatedHistory,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Não foi possível atualizar a solicitação.')
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]: value,
                history: updatedHistory,
              }
            : item
        )
      )
    } catch (error) {
      console.error(error)
      alert('Erro ao atualizar a solicitação no servidor.')
    }
  }

  // Aprova uma solicitação
  async function approveRequest(id: number) {
    const request = requests.find((item) => item.id === id)

    if (!request || request.status === 'Aprovada' || request.status === 'Cancelada') {
      return
    }

    const change: ChangeRecord = {
      field: 'Status',
      previousValue: request.status,
      newValue: 'Aprovada',
      date: new Date().toLocaleString('pt-BR'),
    }

    const updatedHistory = [...request.history, change]

    try {
      const response = await fetch(
        `http://localhost:3001/solicitacoes/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'Aprovada',
            history: updatedHistory,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Não foi possível aprovar a solicitação.')
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'Aprovada',
                history: updatedHistory,
              }
            : item
        )
      )

    } catch (error) {
      console.error(error)
      alert('Erro ao atualizar a solicitação no servidor.')
    }
  }

  // Cancela uma solicitação e registra o motivo
  async function cancelRequest(id: number) {
    const request = requests.find((item) => item.id === id)

    if (
      !request ||
      request.status === 'Aprovada' ||
      request.status === 'Cancelada'
    ) {
      return
    }

    if (!cancellationReason.trim()) {
      alert('Informe o motivo do cancelamento.')
      return
    }

    const reason = cancellationReason.trim()

    const change: ChangeRecord = {
      field: 'Status',
      previousValue: request.status,
      newValue: 'Cancelada',
      date: new Date().toLocaleString('pt-BR'),
      reason: reason,
    }

    const updatedHistory = [...request.history, change]

    try {
      const response = await fetch(
        `http://localhost:3001/solicitacoes/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'Cancelada',
            cancellationReason: reason,
            history: updatedHistory,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Não foi possível cancelar a solicitação.')
      }

      setRequests((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'Cancelada',
                cancellationReason: reason,
                history: updatedHistory,
              }
            : item
        )
      )

      setCancellingRequestId(null)
      setCancellationReason('')

      alert('Solicitação cancelada com sucesso!')

    } catch (error) {
      console.error(error)
      alert('Erro ao cancelar a solicitação no servidor.')
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-icon">C</span>
          <div>
            <h1>COMPASS<span>.AI</span></h1>
            <p>INTELLIGENT SERVICE MANAGEMENT</p>
          </div>
        </div>
        <span className="status">● Sistema operacional</span>
      </header>

      <section className="welcome">
        <span className="eyebrow">PLATAFORMA INTELIGENTE</span>
        <h2>
          Decisões mais inteligentes.<br />
          <span>Serviços mais eficientes.</span>
        </h2>
        <p>
          Analise, classifique e encaminhe solicitações
          com apoio de inteligência artificial.
        </p>
      </section>

      <section className="dashboard">
        <article className="metric">
          <span>Solicitações recebidas</span>
          <strong>{requests.length}</strong>
          <small>Registros na plataforma</small>
        </article>

        <article className="metric">
          <span>Em análise</span>
          <strong>
            {requests.filter(
              (request) =>
                request.status === 'Aguardando revisão' ||
                request.status === 'Recebida'
            ).length}
          </strong>
          <small>Aguardando revisão humana</small>
        </article>

        <article className="metric">
          <span>Aprovadas</span>
          <strong>
            {requests.filter((request) => request.status === 'Aprovada').length}
          </strong>
          <small>Solicitações aprovadas na plataforma</small>
        </article>
      </section>

      <section className="workspace">
        <span className="eyebrow">CENTRAL DE OPERAÇÕES</span>
        <h3>Nova solicitação</h3>
        <p>Registre uma demanda para iniciar o processo de análise.</p>

        <form onSubmit={handleSubmit} className="request-form">
          <label htmlFor="title">Título da solicitação</label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Iluminação pública com defeito"
            required
          />

          <label htmlFor="description">Descrição</label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descreva a situação..."
            rows={4}
            required
          />

          <button type="submit" disabled={analyzing}>
            {analyzing ? 'Analisando com IA...' : 'Registrar solicitação'}
          </button>
        </form>
      </section>

      <section className="workspace">
        <span className="eyebrow">REGISTROS</span>
        <h3>Solicitações cadastradas</h3>

        {loading ? (
          <p>Carregando solicitações...</p>
        ) : requests.length === 0 ? (
          <p>Nenhuma solicitação cadastrada até o momento.</p>
        ) : (
          requests.map((request) => (
            <article className="metric" key={request.id}>
              <strong>{request.title}</strong>
              <p>{request.description}</p>

              <label>Categoria</label>
              <select
                value={request.category}
                disabled={request.status === 'Aprovada' || request.status === 'Cancelada'}
                onChange={(event) =>
                  updateRequest(request.id, 'category', event.target.value)
                }
              >
                <option>Iluminação pública</option>
                <option>Infraestrutura</option>
                <option>Limpeza urbana</option>
                <option>Saúde</option>
                <option>Outros</option>
              </select>

              <label>Prioridade</label>
              <select
                value={request.priority}
                disabled={request.status === 'Aprovada' || request.status === 'Cancelada'}
                onChange={(event) =>
                  updateRequest(request.id, 'priority', event.target.value)
                }
              >
                <option>Baixa</option>
                <option>Média</option>
                <option>Alta</option>
              </select>

              <label>Setor responsável</label>
              <select
                value={request.department}
                disabled={request.status === 'Aprovada' || request.status === 'Cancelada'}
                onChange={(event) =>
                  updateRequest(request.id, 'department', event.target.value)
                }
              >
                <option>Serviços de iluminação</option>
                <option>Secretaria de Obras</option>
                <option>Serviços Urbanos</option>
                <option>Secretaria de Saúde</option>
                <option>Triagem geral</option>
              </select>

              <p><strong>Justificativa:</strong> {request.reason}</p>

<div className="recommendation">
  <h4>Orientação para o cidadão</h4>

  {request.recommendation?.available ? (
    <>
      <p>
        <strong>Órgão responsável:</strong>{' '}
        {request.recommendation.organization}
      </p>

      <p>
        <strong>Serviço:</strong>{' '}
        {request.recommendation.service}
      </p>

      <p>
        {request.recommendation.instructions}
      </p>

      {request.recommendation.url && (
        <a
          href={request.recommendation.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Acessar canal oficial
        </a>
      )}

      <small>
        Fonte: {request.recommendation.source}
      </small>
    </>
  ) : (
    <p>
      {request.recommendation?.message ||
        'Ainda não há um canal oficial cadastrado para este tipo de solicitação.'}
    </p>
  )}
</div>

              <p><strong>Status:</strong> {request.status}</p>

              {request.status === 'Cancelada' && (
                <p>
                  <strong>Motivo do cancelamento:</strong>{' '}
                  {request.cancellationReason || 'Motivo não informado.'}
                </p>
              )}

              <div className="history">
                <h4>Histórico de alterações</h4>

                {(request.history || []).length === 0 ? (
                  <p>Nenhuma alteração registrada.</p>
                ) : (
                  (request.history || []).map((change, index) => (
                    <div key={index}>
                      <p>
                        <strong>{change.field}:</strong>{' '}
                        {change.previousValue} → {change.newValue}
                      </p>

                      <small>
                        {change.date} · Responsável pela revisão
                      </small>

                      {change.reason && (
                        <p>
                          <strong>Motivo:</strong> {change.reason}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {request.status !== 'Aprovada' &&
                request.status !== 'Cancelada' && (
                  <>
                    <button onClick={() => approveRequest(request.id)}>
                      Aprovar encaminhamento
                    </button>

                    {cancellingRequestId !== request.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingRequestId(request.id)
                          setCancellationReason('')
                        }}
                      >
                        Cancelar solicitação
                      </button>
                    ) : (
                      <div>
                        <label htmlFor={`cancel-reason-${request.id}`}>
                          Motivo do cancelamento
                        </label>

                        <textarea
                          id={`cancel-reason-${request.id}`}
                          value={cancellationReason}
                          onChange={(event) =>
                            setCancellationReason(event.target.value)
                          }
                          placeholder="Explique por que esta solicitação será cancelada..."
                          rows={3}
                        />

                        <button
                          type="button"
                          onClick={() => cancelRequest(request.id)}
                        >
                          Confirmar cancelamento
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCancellingRequestId(null)
                            setCancellationReason('')
                          }}
                        >
                          Voltar
                        </button>
                      </div>
                    )}
                  </>
                )}
            </article>
          ))
        )}
      </section>

      <footer>
        COMPASS.AI © 2026 · Inteligência com supervisão humana
      </footer>
    </main>
  )
}

export default App
