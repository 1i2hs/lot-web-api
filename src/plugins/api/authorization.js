const fp = require("fastify-plugin");

async function plugin(fastify, option) {
  fastify.addHook("preHandler", (request, reply, done) => {
    console.log("authz check!");
    const userId = "some-id";
    request.auth = {
      userId,
    };
    done();
  });

  fastify.get("/authz/tokens", async (request, reply) => {});

  fastify.get("/authz/access-token", async (request, reply) => {
    return {
      token: "some-token",
    };
  });
}

module.exports = fp(plugin);
