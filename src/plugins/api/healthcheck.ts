import { FastifyInstance, FastifyPluginOptions } from "fastify";

async function plugin(fastify: FastifyInstance, option: FastifyPluginOptions) {
  fastify.get("/health", async (request, reply) => {
    return {};
  });
}

export default plugin;
