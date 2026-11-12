# COMPASS.AI

**Inteligência artificial para facilitar o acesso do cidadão aos serviços públicos.**

O COMPASS.AI é um protótipo de plataforma que busca facilitar a identificação dos canais adequados para registrar problemas e solicitações relacionados aos serviços públicos.

A proposta é ajudar o cidadão que não sabe a qual órgão recorrer, organizando o relato, sugerindo uma classificação e apresentando orientações sobre canais oficiais previamente cadastrados.

## Problema

Muitas pessoas encontram dificuldades para identificar onde registrar problemas como vazamentos de água, iluminação pública com defeito, descarte irregular de lixo e outras ocorrências urbanas.

Essa dificuldade pode gerar perda de tempo, encaminhamentos incorretos e dificuldade de acesso aos serviços públicos.

## Objetivo

Reduzir essa dificuldade por meio de uma plataforma que combina inteligência artificial, organização de solicitações e orientação sobre canais oficiais de atendimento.

## Funcionalidades implementadas

- Cadastro de solicitações com título e descrição.
- Análise dos relatos utilizando inteligência artificial.
- Sugestão de categoria, prioridade, setor responsável e justificativa.
- Recomendação de canais oficiais previamente cadastrados.
- Apresentação de links e instruções para acesso aos canais recomendados.
- Indicação quando não existe um canal cadastrado para determinado tipo de ocorrência.
- Revisão humana das solicitações.
- Aprovação e cancelamento de solicitações.
- Histórico de alterações e justificativas de cancelamento.
- Painel com indicadores das solicitações.

## Como funciona

1. O cidadão descreve o problema.
2. O backend envia o relato para a API da Groq, utilizando o modelo `openai/gpt-oss-20b`.
3. A inteligência artificial sugere a classificação e a prioridade da solicitação.
4. O sistema consulta seu cadastro interno de canais oficiais, utilizando correspondência de palavras-chave.
5. A plataforma apresenta a orientação encontrada ou informa que ainda não existe um canal cadastrado.
6. A solicitação fica disponível para revisão humana.

**Importante:** a classificação utiliza inteligência artificial, mas a recomendação de canais oficiais é feita por uma correspondência de palavras-chave com dados previamente cadastrados. Essa separação evita que a IA invente links de atendimento.

## Tecnologias utilizadas

### Frontend
- React
- TypeScript
- Vite
- CSS

### Backend
- Node.js
- Express
- API Groq
- SDK OpenAI (compatibilidade com a API da Groq)
- dotenv
- cors

### Armazenamento
- Arquivo JSON local para persistência das solicitações durante a execução do protótipo.

## Como executar o projeto

### Pré-requisitos

- Node.js e npm instalados.
- Chave de API da Groq.

### 1. Clonar o repositório

```bash
git clone https://github.com/bkipper22/COMPASS.AI.git
cd COMPASS.AI
```

### 2. Configurar o backend

```bash
cd backend
npm install
```

Crie um arquivo chamado `.env` dentro da pasta `backend`, com o seguinte conteúdo:

```env
GROQ_API_KEY=sua_chave_aqui
```

Substitua `sua_chave_aqui` pela sua chave de API da Groq.

Inicie o servidor:

```bash
node server.js
```

O backend será iniciado na porta `3001`.

### 3. Configurar o frontend

Abra outro terminal na pasta principal do projeto e execute:

```bash
cd frontend
npm install
npm run dev
```

O Vite exibirá o endereço local para acessar a aplicação, normalmente:

`http://localhost:5173`

Mantenha os dois servidores em execução durante o uso.

## Canais oficiais cadastrados

O protótipo possui recomendações iniciais para ocorrências relacionadas a:

- **Prefeitura Municipal de Florianópolis:** iluminação pública e alguns problemas de infraestrutura e limpeza urbana.
- **CASAN:** problemas relacionados ao abastecimento de água e esgoto.

Os canais são cadastrados previamente no backend e possuem links para os respectivos serviços oficiais.

A cobertura ainda é limitada e não representa um diretório completo de serviços públicos.

## Limitações atuais

O COMPASS.AI está em desenvolvimento e possui as seguintes limitações:

- A cobertura de canais oficiais ainda é restrita.
- As recomendações dependem de palavras-chave previamente cadastradas.
- O sistema não registra solicitações diretamente nos órgãos públicos.
- Não existe integração com sistemas governamentais ou geração de protocolos oficiais.
- O armazenamento atual utiliza arquivo JSON local.
- A classificação sugerida pela inteligência artificial precisa de revisão humana.

O projeto é um protótipo demonstrativo e não substitui os canais oficiais de atendimento.

## Próximas evoluções

- Ampliar e manter atualizado o cadastro de canais oficiais.
- Expandir a cobertura para diferentes serviços e municípios.
- Integrar a plataforma aos sistemas oficiais, quando houver APIs e autorizações disponíveis.
- Implementar banco de dados.
- Desenvolver acompanhamento de protocolos e andamento das solicitações.
- Aprimorar os mecanismos de validação e segurança.

## Status do projeto

**Protótipo funcional em desenvolvimento.**

O COMPASS.AI demonstra uma primeira implementação da proposta de utilizar inteligência artificial para facilitar a identificação e a organização de demandas relacionadas aos serviços públicos.

---

