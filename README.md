# Bot Webex + GitLab

Bot Node.js que recebe webhooks do GitLab e envia notificações de Merge Requests formatadas para salas do Webex.

## Visão Geral

O bot atua como intermediário entre o GitLab e o Webex: ao receber um evento de MR ou de pipeline via webhook, ele formata uma mensagem em Markdown e envia para a sala do Webex correspondente ao projeto. Eventos de release são tratados de forma especial, incluindo a descrição do MR na notificação. Pipelines geram um aviso quando entram em execução (`running`), informando quem as disparou.

```
GitLab → POST /webex-webhook → Bot → Webex API → Sala do Webex
```

## Pré-requisitos

- Node.js 18+
- Token de bot do Webex (`WEBEX_BOT_TOKEN`)
- Acesso ao GitLab para configurar webhooks

## Instalação

```bash
git clone <repo-url>
cd bot-webex-and-gitlab
npm install
cp .env.example .env
# edite o .env com seus valores
node index.js
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

| Variável          | Obrigatória | Descrição                                 |
| ----------------- | ----------- | ----------------------------------------- |
| `WEBEX_BOT_TOKEN` | Sim         | Token Bearer do bot no Webex              |
| `ADMIN_EMAIL`     | Sim         | E-mail que recebe alertas de saúde e café |
| `ROOM_DEFAULT`    | Sim         | UUID da sala Webex padrão (fallback)      |
| `ROOM_STOREFRONT` | Não         | UUID da sala do projeto `storefront`      |
| `ROOM_CHECKOUT`   | Não         | UUID da sala do projeto `checkout`        |
| `PORT`            | Não         | Porta HTTP (padrão: `3000`)               |

Para adicionar novos projetos, declare `ROOM_{NOME_DO_PROJETO}` no `.env` e mapeie em `config.js` (veja [Adicionando Projetos](#adicionando-projetos)).

## Endpoints

### `POST /webex-webhook`

Endpoint principal. Recebe o payload JSON do GitLab e envia notificação ao Webex.

Configure este URL no GitLab em **Settings → Webhooks**, marcando os eventos **Merge request events** e **Pipeline events**.

### `GET /health`

Verifica se o bot está ativo. Envia uma mensagem de status para o `ADMIN_EMAIL`.

### `GET /pedirCafe`

Envia alerta de estoque crítico de café para o `ADMIN_EMAIL`.

## Fluxo de Processamento

```
Receber webhook
    │
    ├─ object_kind = "merge_request" → handleMergeRequest
    │       ├─ MR em rascunho (Draft / WIP) → Ignorar
    │       ├─ Branch não permitida (se configurado) → Ignorar
    │       ├─ Projeto sem sala mapeada → Ignorar
    │       ├─ Branch de release? (release/*) → Sim → formatReleaseMR()
    │       ├─ action = "open"   → formatOpenMR()
    │       ├─ action = "reopen" → formatReopenMR()
    │       ├─ state  = "merged" → formatMergedMR()
    │       └─ state  = "closed" → formatClosedMR()
    │
    ├─ object_kind = "pipeline" → handlePipeline
    │       ├─ status ≠ "running" → Ignorar
    │       ├─ pipeline já notificada (dedup por id) → Ignorar
    │       ├─ Projeto sem sala mapeada → Ignorar
    │       └─ formatPipelineRunning()
    │
    ├─ outro object_kind → Ignorar
    │
    └─ sendToRoom(roomId, markdown) → Webex API
```

### Detecção de Draft

Um MR é considerado rascunho se qualquer condição for verdadeira:

- `object_attributes.draft === true`
- `object_attributes.work_in_progress === true`
- Título começa com `Draft:`, `WIP:`, `[Draft]` ou `[WIP]` (case-insensitive)

### Detecção de Release

Um MR é tratado como release se a branch de origem **ou** destino corresponder ao padrão `/^release\//i`.

### Notificação de Pipelines

O bot avisa somente quando a pipeline entra em execução (`object_attributes.status === "running"`), informando o projeto, a branch (`ref`), quem a disparou (`event.user.username`) e o link da pipeline. Como o GitLab pode disparar vários eventos `running` para a mesma pipeline, os IDs já notificados são guardados em memória (dedup por `object_attributes.id`, com limite de 500 IDs). O estado de dedup é reiniciado ao reiniciar o processo.

## Adicionando Projetos

1. Adicione a variável no `.env`:

   ```
   ROOM_MEU_PROJETO=<uuid-da-sala-webex>
   ```

2. Mapeie o nome do projeto em `config.js`:
   ```js
   const PROJECT_ROOM_MAP = {
     storefront: process.env.ROOM_STOREFRONT,
     checkout: process.env.ROOM_CHECKOUT,
     "meu-projeto": process.env.ROOM_MEU_PROJETO, // novo
   };
   ```

O nome do projeto é extraído de `event.project.name` (payload do GitLab), sem distinção de maiúsculas/minúsculas na busca.

## Estrutura de Arquivos

```
bot-webex-and-gitlab/
├── index.js                 # Servidor HTTP e roteamento
├── config.js                # Variáveis de ambiente e mapeamento de projetos
├── handlers/
│   ├── mergeRequest.js      # Lógica de negócio: filtra, decide sala, chama formatter
│   └── pipeline.js          # Notificação de pipelines em execução (com dedup por id)
├── messages/
│   └── formatter.js         # Funções que geram o Markdown das mensagens
├── services/
│   └── webex.js             # Cliente da API do Webex
├── .env.example             # Template de configuração
└── package.json
```

## Mensagens Enviadas

Todas as mensagens são formatadas em Markdown e enviadas para a sala Webex correspondente ao projeto.

| Evento        | Emoji | Gatilho                                    |
| ------------- | ----- | ------------------------------------------ |
| MR aberto     | 🎉    | `action: open`                             |
| MR de release | 🚀    | `action: open/reopen` + branch `release/*` |
| MR reaberto   | ♻️    | `action: reopen`                           |
| MR mergeado   | ✅    | `state: merged`                            |
| MR fechado    | 🛑    | `state: closed`                            |
| Pipeline em execução | 🏃 | `object_kind: pipeline` + `status: running` |

Datas são exibidas no fuso horário de **São Paulo** (`America/Sao_Paulo`) no formato `DD/MM/YYYY HH:mm:ss`.

## Dependências

| Pacote   | Versão  | Uso                         |
| -------- | ------- | --------------------------- |
| `dotenv` | ^16.4.7 | Carrega variáveis do `.env` |

Todos os demais recursos (servidor HTTP, `fetch`) são módulos nativos do Node.js.
