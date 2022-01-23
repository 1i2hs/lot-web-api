import { FastifyInstance, FastifyPluginOptions } from "fastify";
import authzPlugin from "./authorization";
import itemPlugin from "./item";
import tagPlugin from "./tag";

async function apiPlugin(
  fastify: FastifyInstance,
  option: FastifyPluginOptions
) {

  await fastify.register(authzPlugin);

  await fastify.register(itemPlugin);

  await fastify.register(tagPlugin);
}

export default apiPlugin;
