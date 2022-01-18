import { FastifyInstance, FastifyPluginOptions } from "fastify";
import authzPlugin from "./authorization";
import itemPlugin from "./item";

async function apiPlugin(
  fastify: FastifyInstance,
  option: FastifyPluginOptions
) {
  await fastify.register(authzPlugin);

  await fastify.register(itemPlugin);
}

export default apiPlugin;
