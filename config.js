"use strict";
require("dotenv").config();

const PROJECT_ROOM_MAP = {
  storefront: process.env.ROOM_STOREFRONT,
  checkout: process.env.ROOM_CHECKOUT,
};

const ALLOWED_SOURCE_PREFIXES = null;

function getRoomForProject(projectName) {
  return PROJECT_ROOM_MAP[projectName] || process.env.ROOM_DEFAULT;
}

module.exports = {
  PORT: process.env.PORT || 3000,
  WEBEX_BOT_TOKEN: process.env.WEBEX_BOT_TOKEN,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  getRoomForProject,
  ALLOWED_SOURCE_PREFIXES,
  RELEASE_BRANCH_PATTERN: /^release\//i,
};
