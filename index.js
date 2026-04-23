"use strict";
require("dotenv").config();

const http = require("http");
const { handleMergeRequest } = require("./handlers/mergeRequest");
const { sendToAdmin } = require("./services/webex");
const { formatDate } = require("./messages/formatter");
const { PORT } = require("./config");

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    try {
      await sendToAdmin(`✅ Bot ativo! (${formatDate()})`);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Online. Mensagem de status enviada.");
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Falha: ${err.message}`);
    }
    return;
  }

  if (req.method === "GET" && req.url === "/pedirCafe") {
    try {
      await sendToAdmin(
        `⚠️ Estoque de café em nível crítico. Providencie a reposição. ☕`,
      );
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Pedido de café enviado!");
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Falha: ${err.message}`);
    }
    return;
  }

  if (req.method === "POST" && req.url === "/webex-webhook") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      let event;
      try {
        event = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Payload inválido.");
        return;
      }

      if (event.object_kind !== "merge_request") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Evento ignorado (não é merge_request).");
        return;
      }

      try {
        const result = await handleMergeRequest(event);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("[Webhook] Erro ao processar MR:", err.message);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Erro interno.");
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Rota não encontrada.");
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
