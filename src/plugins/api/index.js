const authzPlugin = require("./authorization");
const itemPlugin = require("./item");

async function apiPlugin(fastify, option) {
  fastify.register(authzPlugin);

  fastify.register(itemPlugin);
}

module.exports = apiPlugin;
