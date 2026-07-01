# Notificação de pipelines em execução

**Data:** 2026-07-01

## Objetivo

Quando o GitLab dispara um webhook de pipeline com status `running`, o bot
envia uma mensagem para a sala do projeto informando **quem** disparou a
pipeline e para **onde** (sala mapeada pelo nome do projeto), evitando
mensagens duplicadas da mesma execução.

## Escopo

- Somente o status `running` gera notificação. Demais status (`pending`,
  `success`, `failed`, `canceled`, `skipped`, etc.) são ignorados.
- A notificação vai para a mesma sala do projeto usada pelos MRs
  (`config.getRoomForProject`), sem novas variáveis de ambiente.
- Sem novas dependências.

## Payload de referência (GitLab Pipeline Hook)

Campos relevantes de `event`:

- `object_kind`: `"pipeline"`
- `object_attributes.id`: id numérico da pipeline (chave de deduplicação)
- `object_attributes.status`: `created` | `pending` | `running` | `success` |
  `failed` | `canceled` | `skipped` | ...
- `object_attributes.ref`: branch/tag da pipeline
- `object_attributes.url`: URL da pipeline (pode não existir em versões antigas)
- `user.username` / `user.name`: quem disparou a pipeline
- `project.name`: nome do projeto (usado para mapear a sala)
- `project.web_url`: usado para montar a URL da pipeline quando `url` ausente

## Componentes

### 1. `index.js` (roteamento)

Hoje o handler do webhook ignora tudo que não é `merge_request`. Alterar para
rotear por `object_kind`:

- `object_kind === "merge_request"` → `handleMergeRequest(event)` (fluxo atual)
- `object_kind === "pipeline"` → `handlePipeline(event)` (novo)
- caso contrário → responde 200 com "Evento ignorado".

O `try/catch` existente que responde 500 em falha é reaproveitado para ambos.

### 2. `handlers/pipeline.js` (novo)

Espelha o estilo de `handlers/mergeRequest.js`.

Função `handlePipeline(event)`:

1. Lê `attrs = event.object_attributes || {}`.
2. Se `attrs.status !== "running"` → retorna
   `{ ignored: true, reason: "status_not_running" }`.
3. **Deduplicação:** mantém um `Set` de IDs de pipeline já notificados, em
   módulo (memória do processo). Se `attrs.id` já está no set → retorna
   `{ ignored: true, reason: "duplicate" }`. Caso contrário, adiciona ao set.
   - Cap de tamanho: ao atingir `MAX_TRACKED = 500`, remove o id mais antigo
     (o `Set` do JS preserva ordem de inserção — remover `values().next().value`).
4. Extrai campos:
   - `projectName = event.project?.name || "Projeto desconhecido"`
   - `ref = attrs.ref || "branch desconhecida"`
   - `triggeredBy = event.user?.username || "Desconhecido"`
   - `pipelineUrl = attrs.url || (event.project?.web_url ? \`${event.project.web_url}/-/pipelines/${attrs.id}\` : "")`
   - `timestamp = formatDate()`
5. `roomId = config.getRoomForProject(projectName)`; se vazio → retorna
   `{ ignored: true, reason: "no_room_configured" }`.
6. `markdown = formatPipelineRunning({ projectName, ref, triggeredBy, pipelineUrl, timestamp })`.
7. `await sendToRoom(roomId, markdown)`.
8. Retorna `{ sent: true, projectName, pipelineId: attrs.id }`.

Exporta `{ handlePipeline }`.

### 3. `messages/formatter.js`

Nova função `formatPipelineRunning({ projectName, ref, triggeredBy, pipelineUrl, timestamp })`
no mesmo estilo das demais. Exemplo de saída:

```
## 🏃 Pipeline em execução

**Projeto:** <projectName>

**Branch:** `<ref>`

**Disparada por:** <triggeredBy>

**Data:** <timestamp>

🔗 [Ver pipeline](<pipelineUrl>)
```

Se `pipelineUrl` for vazio, o link é omitido. Adicionar à lista de exports.

## Fluxo

`POST /webex-webhook` → parse JSON → `object_kind === "pipeline"` →
`handlePipeline` → filtra status `running` → dedup por id → resolve sala →
`formatPipelineRunning` → `sendToRoom`.

## Tratamento de erros

- Payload inválido → 400 (comportamento atual mantido).
- Falha no handler → 500 via `try/catch` do `index.js` (comportamento atual).
- Casos ignorados retornam `{ ignored: true, reason }` e respondem 200.

## Limitações aceitas

- A deduplicação é em memória: reiniciar o processo zera o set, então no pior
  caso uma pipeline ativa pode receber um segundo aviso após um restart.
  Aceitável para o escopo atual (sem banco de dados).

## Fora de escopo

- Notificação de outros status (success/failed/canceled).
- Sala dedicada de pipelines.
- Filtro de branch para pipelines.
