"use strict";
const config = require("../config");
const { sendToRoom } = require("../services/webex");
const {
  formatDate,
  formatOpenMR,
  formatReleaseMR,
  formatReopenMR,
  formatMergedMR,
  formatClosedMR,
} = require("../messages/formatter");

const DRAFT_TITLE_PATTERN = /^(Draft:|WIP:|\[Draft\]|\[WIP\])/i;

function isDraft(event) {
  const attrs = event.object_attributes || {};
  if (attrs.draft === true || attrs.work_in_progress === true) return true;
  return DRAFT_TITLE_PATTERN.test(attrs.title || "");
}

function isAllowedBranch(sourceBranch) {
  if (!config.ALLOWED_SOURCE_PREFIXES) return true;
  return config.ALLOWED_SOURCE_PREFIXES.some((prefix) => sourceBranch.startsWith(prefix));
}

async function handleMergeRequest(event) {
  const attrs = event.object_attributes || {};
  const action = attrs.action || "unknown";
  const state = attrs.state || "unknown";

  if (isDraft(event)) {
    console.log(`[MR] Ignorado: draft — "${attrs.title}"`);
    return { ignored: true, reason: "draft" };
  }

  const projectName = event.project?.name || "Projeto desconhecido";
  const userName = event.user?.username || "Desconhecido";
  const sourceBranch = attrs.source_branch || "branch desconhecida";
  const targetBranch = attrs.target_branch || "branch desconhecida";
  const mrUrl = attrs.url || "";
  const mrTitle = attrs.title || "Sem título";
  const description = attrs.description || "";
  const mrAuthor = event.user?.username || "Desconhecido";
  const timestamp = formatDate();

  if (!isAllowedBranch(sourceBranch)) {
    console.log(`[MR] Ignorado: branch '${sourceBranch}' não está na lista de permitidas.`);
    return { ignored: true, reason: "branch_not_allowed" };
  }

  const roomId = config.getRoomForProject(projectName);
  if (!roomId) {
    console.warn(`[MR] Nenhuma sala configurada para o projeto '${projectName}'.`);
    return { ignored: true, reason: "no_room_configured" };
  }

  const isRelease =
    config.RELEASE_BRANCH_PATTERN.test(sourceBranch) ||
    config.RELEASE_BRANCH_PATTERN.test(targetBranch);

  let markdown = "";

  if (action === "open") {
    markdown = isRelease
      ? formatReleaseMR({ projectName, mrAuthor, sourceBranch, targetBranch, mrUrl, mrTitle, description, timestamp })
      : formatOpenMR({ projectName, mrAuthor, sourceBranch, targetBranch, mrUrl, mrTitle, timestamp });
  } else if (action === "reopen") {
    markdown = isRelease
      ? formatReleaseMR({ projectName, mrAuthor, sourceBranch, targetBranch, mrUrl, mrTitle, description, timestamp })
      : formatReopenMR({ projectName, userName, sourceBranch, targetBranch, mrUrl, mrTitle, timestamp });
  } else if (state === "merged") {
    markdown = formatMergedMR({ projectName, userName, sourceBranch, targetBranch, timestamp });
  } else if (state === "closed") {
    markdown = formatClosedMR({ projectName, userName, sourceBranch, targetBranch, timestamp });
  } else {
    console.log(`[MR] Ignorado: ação '${action}' / estado '${state}' não tratado.`);
    return { ignored: true, reason: `action_not_handled:${action}:${state}` };
  }

  await sendToRoom(roomId, markdown);
  console.log(`[MR] Notificação enviada → projeto='${projectName}' ação='${action}' release=${isRelease}`);
  return { sent: true, projectName, action, state, isRelease };
}

module.exports = { handleMergeRequest };
