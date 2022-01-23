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

  fastify.get("/auth/csrf", async (request, reply) => {
    const token = await reply.generateCsrf();
    return {
      token,
    };
  });

  /**
   * default: issues an access token and refresh token
   * grantType: "refresh_token" => issues a new access token
   *   if the regeneration of access token fails, force client page to sign out and re-sign in
   */
  fastify.post("/auth/token", async (request, reply) => {
    return { token: "some-token" };
  });
}

export default fp(plugin);
