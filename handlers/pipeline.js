"use strict";
const config = require("../config");
const { sendToRoom } = require("../services/webex");
const { formatDate, formatPipelineRunning } = require("../messages/formatter");

const MAX_TRACKED = 500;
const notifiedPipelines = new Set();

function alreadyNotified(pipelineId) {
  if (notifiedPipelines.has(pipelineId)) return true;
  notifiedPipelines.add(pipelineId);
  if (notifiedPipelines.size > MAX_TRACKED) {
    // Set preserva a ordem de inserção — descarta o mais antigo.
    notifiedPipelines.delete(notifiedPipelines.values().next().value);
  }
  return false;
}

async function handlePipeline(event) {
  const attrs = event.object_attributes || {};
  const status = attrs.status || "unknown";

  if (status !== "running") {
    console.log(`[Pipeline] Ignorado: status '${status}' (só notificamos 'running').`);
    return { ignored: true, reason: "status_not_running" };
  }

  if (alreadyNotified(attrs.id)) {
    console.log(`[Pipeline] Ignorado: pipeline #${attrs.id} já notificada.`);
    return { ignored: true, reason: "duplicate" };
  }

  const projectName = event.project?.name || "Projeto desconhecido";
  const ref = attrs.ref || "branch desconhecida";
  const triggeredBy = event.user?.username || "Desconhecido";
  const pipelineUrl =
    attrs.url ||
    (event.project?.web_url
      ? `${event.project.web_url}/-/pipelines/${attrs.id}`
      : "");
  const timestamp = formatDate();

  const roomId = config.getRoomForProject(projectName);
  if (!roomId) {
    console.warn(`[Pipeline] Nenhuma sala configurada para o projeto '${projectName}'.`);
    return { ignored: true, reason: "no_room_configured" };
  }

  const markdown = formatPipelineRunning({ projectName, ref, triggeredBy, pipelineUrl, timestamp });

  await sendToRoom(roomId, markdown);
  console.log(`[Pipeline] Notificação enviada → projeto='${projectName}' pipeline=#${attrs.id} por='${triggeredBy}'`);
  return { sent: true, projectName, pipelineId: attrs.id };
}

module.exports = { handlePipeline };
