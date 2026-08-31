"use strict";
const { WEBEX_BOT_TOKEN, ADMIN_EMAIL, LUIS_EMAIL } = require("../config");

const WEBEX_BASE_URL = "https://webexapis.com/v1";

async function sendMessage(payload) {
  const response = await fetch(`${WEBEX_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WEBEX_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Webex API error: ${response.status} - ${errText}`);
  }

  return response.json();
}

function sendToRoom(roomId, markdown) {
  return sendMessage({ roomId, markdown });
}

function sendToEmail(email, text) {
  return sendMessage({ toPersonEmail: email, text });
}

function sendToAdmin(text) {
  return sendToEmail(ADMIN_EMAIL, text);
}

function sendToAdmins(text) {
  const emails = [ADMIN_EMAIL, LUIS_EMAIL].filter(Boolean);
  return Promise.all(emails.map((email) => sendToEmail(email, text)));
}

module.exports = {
  sendMessage,
  sendToRoom,
  sendToEmail,
  sendToAdmin,
  sendToAdmins,
};
