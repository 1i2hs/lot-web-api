import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";

async function plugin(fastify: FastifyInstance, option: FastifyPluginOptions) {
  fastify.addHook("preHandler", (request, reply, done) => {
    console.log("authz check!");
    const userId = "1";
    request.auth = {
      userId,
    };
    done();
  });

  fastify.get("/authz/tokens", async (request, reply) => {
    return {};
  });

  fastify.get("/authz/access-token", async (request, reply) => {
    return {
      token: "some-token",
    };
  });
}

export default fp(plugin);
