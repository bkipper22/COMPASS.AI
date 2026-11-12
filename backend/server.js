
require('dotenv').config()

const OpenAI = require('openai')
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

const app = express()

app.use(cors())
app.use(express.json())

// Listas de valores permitidos
const categorias = [
  'Iluminação pública',
  'Infraestrutura',
  'Limpeza urbana',
  'Saúde',
  'Outros'
]

const prioridades = ['Baixa', 'Média', 'Alta']

const setores = [
  'Serviços de iluminação',
  'Secretaria de Obras',
  'Serviços Urbanos',
  'Secretaria de Saúde',
  'Triagem geral'
]


// Canais oficiais de atendimento de Florianópolis
const canaisOficiais = [
  {
   'palavras-chave': [
      'vazamento de agua',
      'vazamento agua',
      'vazamento de esgoto',
      'vazamento esgoto',
      'falta de agua'
    ],
    organization: 'CASAN',
    service: 'Comunicação de problemas de água e esgoto',
    url: 'https://casan.com.br/canais-atendimento',
    instructions: 'Acesse os canais de atendimento e escolha o serviço correspondente ao problema relatado.',
    source: 'Site oficial da CASAN'
  },
  {
   'palavras-chave': [
      'poste apagado',
      'iluminacao publica',
      'luz apagada',
      'lampada queimada',
      'buraco na rua',
      'buraco na via',
      'descarte irregular de lixo',
      'lixo na rua'
    ],
    organization: 'Prefeitura Municipal de Florianópolis',
    service: 'Portal de Atendimento — Solicitação de Serviços',
    url: 'https://servicos.floripa.sc.gov.br/atendimento/',
    instructions: 'Acesse o portal da Prefeitura e procure a opção Solicitação de Serviços.',
    source: 'Portal oficial da Prefeitura de Florianópolis'
  }
]

// Normaliza textos para facilitar a identificação dos problemas
function normalizarTexto(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// Identifica o canal oficial recomendado
function encontrarCanal(title, description) {
  const relato = normalizarTexto(`${title} ${description}`)

  const canal = canaisOficiais.find((item) =>
    item['palavras-chave'].some((palavra) =>
      relato.includes(normalizarTexto(palavra))
    )
  )

  if (!canal) {
    return {
      available: false,
      message: 'Ainda não temos um canal oficial cadastrado para este tipo de solicitação.',
      organization: null,
      service: null,
      url: null,
      instructions: null,
      source: null
    }
  }

  return {
    available: true,
    organization: canal.organization,
    service: canal.service,
    url: canal.url,
    instructions: canal.instructions,
    source: canal.source
  }
}

// Armazenamento das solicitações
const caminhoArquivo = path.join(__dirname, 'dados.json')

function carregarSolicitacoes() {
  try {
    const dados = fs.readFileSync(caminhoArquivo, 'utf8')
    const solicitacoes = JSON.parse(dados)

    return Array.isArray(solicitacoes) ? solicitacoes : []
  } catch (error) {
    return []
  }
}

const solicitacoes = carregarSolicitacoes()

function salvarSolicitacoes() {
  fs.writeFileSync(
    caminhoArquivo,
    JSON.stringify(solicitacoes, null, 2),
    'utf8'
  )
}

// Rota inicial
app.get('/', (req, res) => {
  res.json({
    system: 'COMPASS.AI',
    message: 'Servidor funcionando corretamente!',
    status: 'online'
  })
})

// Análise inteligente com IA
app.post('/analisar-ia', async (req, res) => {
  const { title, description } = req.body

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    typeof description !== 'string' ||
    !description.trim()
  ) {
    return res.status(400).json({
      message: 'Título e descrição são obrigatórios.'
    })
  }

  try {
    const resposta = await ai.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `
Você é o agente de análise do COMPASS.AI,
uma plataforma de gestão de serviços públicos.

Analise a solicitação e sugira categoria,
prioridade e setor responsável.

Categorias:
Iluminação pública, Infraestrutura,
Limpeza urbana, Saúde, Outros.

Prioridades:
Baixa, Média, Alta.

Setores:
Serviços de iluminação, Secretaria de Obras,
Serviços Urbanos, Secretaria de Saúde,
Triagem geral.

Não invente informações.
Considere o risco e o impacto para a população
ao recomendar a prioridade.

A prioridade é uma recomendação sujeita
à validação humana.

Retorne somente JSON com:
category, priority, department e reason.
          `
        },
        {
          role: 'user',
          content: `Título: ${title}\nDescrição: ${description}`
        }
      ],
      response_format: {
        type: 'json_object'
      }
    })

    const analise = JSON.parse(
      resposta.choices[0].message.content
    )

    if (
      !analise ||
      !categorias.includes(analise.category) ||
      !prioridades.includes(analise.priority) ||
      !setores.includes(analise.department) ||
      typeof analise.reason !== 'string' ||
      !analise.reason.trim()
    ) {
      return res.status(502).json({
        success: false,
        message: 'A IA retornou uma análise fora dos padrões esperados.'
      })
    }

   const canalRecomendado = encontrarCanal(title, description)

return res.json({
  success: true,
  analise: {
    ...analise,
    recommendation: canalRecomendado
  }
})
  

  } catch (error) {
    console.error('Erro na análise com Groq:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Não foi possível realizar a análise com IA.'
    })
  }
})

// Cadastro de novas solicitações
app.post('/solicitacoes', (req, res) => {
  const {
  title,
  description,
  category,
  priority,
  department,
  reason,
  recommendation
} = req.body
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    typeof description !== 'string' ||
    !description.trim()
  ) {
    return res.status(400).json({
      message: 'Título e descrição são obrigatórios.'
    })
  }

 const novaSolicitacao = {
  id: Date.now(),
  title: title.trim(),
  description: description.trim(),
  category: category || 'Outros',
  priority: priority || 'Baixa',
  department: department || 'Triagem geral',
  reason: reason || 'Aguardando avaliação.',
  recommendation: recommendation || {
    available: false,
    message: 'Nenhum canal recomendado.'
  },
  status: 'Aguardando revisão',
  history: []
}

  if (!categorias.includes(novaSolicitacao.category)) {
    return res.status(400).json({
      message: 'Categoria inválida.'
    })
  }

  if (!prioridades.includes(novaSolicitacao.priority)) {
    return res.status(400).json({
      message: 'Prioridade inválida.'
    })
  }

  if (!setores.includes(novaSolicitacao.department)) {
    return res.status(400).json({
      message: 'Setor responsável inválido.'
    })
  }

  solicitacoes.push(novaSolicitacao)
  salvarSolicitacoes()

  return res.status(201).json({
    message: 'Solicitação recebida com sucesso!',
    solicitacao: novaSolicitacao
  })
})

// Atualização de solicitações
app.put('/solicitacoes/:id', (req, res) => {
  const id = Number(req.params.id)

  const index = solicitacoes.findIndex(
    (solicitacao) => solicitacao.id === id
  )

  if (index === -1) {
    return res.status(404).json({
      message: 'Solicitação não encontrada.'
    })
  }

  const solicitacaoAtual = solicitacoes[index]

  // Impede alterações em solicitações finalizadas
  if (
    solicitacaoAtual.status === 'Aprovada' ||
    solicitacaoAtual.status === 'Cancelada'
  ) {
    return res.status(409).json({
      message: 'Esta solicitação já foi finalizada e não pode ser alterada.'
    })
  }

  const {
    category,
    priority,
    department,
    status,
    history,
    cancellationReason
  } = req.body

  // Validação dos campos
  if (
    category !== undefined &&
    !categorias.includes(category)
  ) {
    return res.status(400).json({
      message: 'Categoria inválida.'
    })
  }

  if (
    priority !== undefined &&
    !prioridades.includes(priority)
  ) {
    return res.status(400).json({
      message: 'Prioridade inválida.'
    })
  }

  if (
    department !== undefined &&
    !setores.includes(department)
  ) {
    return res.status(400).json({
      message: 'Setor responsável inválido.'
    })
  }

  if (
    status !== undefined &&
    !['Aprovada', 'Cancelada'].includes(status)
  ) {
    return res.status(400).json({
      message: 'Status inválido.'
    })
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({
      message: 'O histórico de alterações é obrigatório.'
    })
  }

  // Validação da estrutura do histórico
  const historicoValido = history.every((change) =>
    change &&
    typeof change.field === 'string' &&
    typeof change.previousValue === 'string' &&
    typeof change.newValue === 'string' &&
    typeof change.date === 'string' &&
    (
      change.reason === undefined ||
      typeof change.reason === 'string'
    )
  )

  if (!historicoValido) {
    return res.status(400).json({
      message: 'Um ou mais registros do histórico são inválidos.'
    })
  }

  // Confere se a alteração de status está registrada no histórico
  if (status !== undefined) {
    const alteracaoRegistrada = history.some((change) =>
      change &&
      typeof change.field === 'string' &&
      change.field.trim().toLowerCase() === 'status' &&
      typeof change.previousValue === 'string' &&
      change.previousValue.trim() === solicitacaoAtual.status.trim() &&
      typeof change.newValue === 'string' &&
      change.newValue.trim() === status.trim()
    )

    if (!alteracaoRegistrada) {
      return res.status(400).json({
        message: 'A alteração de status precisa estar registrada no histórico.'
      })
    }
  }

  // Exige justificativa para cancelamento
  if (
    status === 'Cancelada' &&
    (
      typeof cancellationReason !== 'string' ||
      !cancellationReason.trim()
    )
  ) {
    return res.status(400).json({
      message: 'Informe o motivo do cancelamento.'
    })
  }

  if (
    cancellationReason !== undefined &&
    (
      typeof cancellationReason !== 'string' ||
      !cancellationReason.trim()
    )
  ) {
    return res.status(400).json({
      message: 'O motivo do cancelamento é inválido.'
    })
  }

  // Atualiza somente os campos permitidos
  solicitacoes[index] = {
    ...solicitacaoAtual,
    ...(category !== undefined && { category }),
    ...(priority !== undefined && { priority }),
    ...(department !== undefined && { department }),
    ...(status !== undefined && { status }),
    history,
    ...(cancellationReason !== undefined && {
      cancellationReason: cancellationReason.trim()
    })
  }

  salvarSolicitacoes()

  return res.json({
    message: 'Solicitação atualizada com sucesso!',
    solicitacao: solicitacoes[index]
  })
})

// Consulta todas as solicitações
app.get('/solicitacoes', (req, res) => {
  return res.json(solicitacoes)
})

// Inicialização do servidor
const PORT = 3001

app.listen(PORT, () => {
  console.log(`COMPASS.AI backend rodando na porta ${PORT}`)
})
