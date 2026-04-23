"use strict";

function formatDate() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function formatOpenMR({ projectName, mrAuthor, sourceBranch, targetBranch, mrUrl, mrTitle, timestamp }) {
  return (
    `## 🎉 Novo Merge Request\n\n` +
    `**Projeto:** ${projectName}\n\n` +
    `**Título:** ${mrTitle}\n\n` +
    `**Autor:** ${mrAuthor}\n\n` +
    `**Branch:** \`${sourceBranch}\` → \`${targetBranch}\`\n\n` +
    `**Data:** ${timestamp}\n\n` +
    `🔗 [Abrir MR](${mrUrl})\n\n` +
    `> 🚀 Vamos revisar e colaborar!`
  );
}

function formatReleaseMR({ projectName, mrAuthor, sourceBranch, targetBranch, mrUrl, mrTitle, description, timestamp }) {
  const descBlock = description?.trim()
    ? `\n---\n\n### 📋 Descrição da Release\n\n${description.trim()}\n\n---\n\n`
    : "\n\n";

  return (
    `## 🚀 Release Aberta — \`${sourceBranch}\`\n\n` +
    `**Projeto:** ${projectName}\n\n` +
    `**Título:** ${mrTitle}\n\n` +
    `**Autor:** ${mrAuthor}\n\n` +
    `**Branch:** \`${sourceBranch}\` → \`${targetBranch}\`\n\n` +
    `**Data:** ${timestamp}` +
    descBlock +
    `🔗 [Abrir MR](${mrUrl})\n\n` +
    `> 📦 Esta release está aguardando revisão e aprovação.`
  );
}

function formatReopenMR({ projectName, userName, sourceBranch, targetBranch, mrUrl, mrTitle, timestamp }) {
  return (
    `## ♻️ Merge Request Reaberto\n\n` +
    `**Projeto:** ${projectName}\n\n` +
    `**Título:** ${mrTitle}\n\n` +
    `**Reaberto por:** ${userName}\n\n` +
    `**Branch:** \`${sourceBranch}\` → \`${targetBranch}\`\n\n` +
    `**Data:** ${timestamp}\n\n` +
    `🔗 [Abrir MR](${mrUrl})\n\n` +
    `> 📌 Pronto para ser revisado novamente!`
  );
}

function formatMergedMR({ projectName, userName, sourceBranch, targetBranch, timestamp }) {
  return (
    `## ✅ Merge Request Concluído\n\n` +
    `**Projeto:** ${projectName}\n\n` +
    `**Merge feito por:** ${userName}\n\n` +
    `**Branch:** \`${sourceBranch}\` → \`${targetBranch}\`\n\n` +
    `**Data:** ${timestamp}\n\n` +
    `> 🎊 Parabéns a todos os envolvidos!`
  );
}

function formatClosedMR({ projectName, userName, sourceBranch, targetBranch, timestamp }) {
  return (
    `## 🛑 Merge Request Fechado\n\n` +
    `**Projeto:** ${projectName}\n\n` +
    `**Fechado por:** ${userName}\n\n` +
    `**Branch:** \`${sourceBranch}\` → \`${targetBranch}\`\n\n` +
    `**Data:** ${timestamp}\n\n` +
    `> 🔒 Nenhuma alteração foi mergeada desta vez.`
  );
}

module.exports = {
  formatDate,
  formatOpenMR,
  formatReleaseMR,
  formatReopenMR,
  formatMergedMR,
  formatClosedMR,
};
