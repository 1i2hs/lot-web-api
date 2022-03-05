import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import fp from "fastify-plugin";
import * as firebaseAdmin from "firebase-admin";
import { applicationDefault } from "firebase-admin/app";
import * as firebaseAdminAuth from "firebase-admin/auth";
import { AppError, commonErrors } from "../../error";
import config from "../../config";

async function plugin(fastify: FastifyInstance, option: FastifyPluginOptions) {
  firebaseAdmin.initializeApp({
    projectId: config.firebase.projectId,
    credential: applicationDefault(),
  });

  const authzService = fastify.service.authz;

  fastify.decorateRequest("userId", null);

  fastify.decorate(
    "authUser",
    (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
      const { at, rt } = request.cookies;
      if (at === undefined) {
        throw new AppError(
          commonErrors.authorizationError,
          "Empty access token",
          true,
          401
        );
      }
      if (rt === undefined) {
        throw new AppError(
          commonErrors.authorizationError,
          "Empty refresh token",
          true,
          401
        );
      }

      // automatically regenerates access token when it expires
      authzService
        .validateAuthTokens(at, rt)
        .then(({ uid, newAccessToken }) => {
          request.userId = uid;
          console.log(request.userId);
          if (newAccessToken !== undefined) {
            reply.setCookie("at", newAccessToken, {
              httpOnly: true,
            });
          }
          done();
        });
    }
  );

  const newTokenJsonSchema = {
    body: {
      type: "object",
      required: ["idToken"],
      properties: {
        idToken: { type: "string" },
      },
    },
  };

  /**
   * issues an access token and refresh token
   * this route can be used for both sign-in and sign-up
   */
  fastify.post<{ Body: { idToken: string } }>(
    "/auth/sign-in",
    {
      schema: newTokenJsonSchema,
    },
    async (request, reply) => {
      try {
        const { idToken } = request.body;
        const decodedToken = await firebaseAdminAuth
          .getAuth()
          .verifyIdToken(idToken);

        const { accessToken, refreshToken } = await authzService.generateTokens(
          decodedToken.uid
        );
        reply
          .setCookie("at", accessToken, {
            httpOnly: true,
          })
          .setCookie("rt", refreshToken, {
            httpOnly: true,
          })
          .send();
      } catch (error) {
        if (error instanceof Error) {
          fastify.log.warn(error.message);
          throw new AppError(
            commonErrors.authorizationError,
            "invalid auth info for sign-in",
            true
          );
        }
      }
    }
  );

  fastify.get(
    "/auth/csrf",
    {
      onRequest: fastify.authUser,
    },
    async (request, reply) => {
      const token = await reply.generateCsrf();
      return {
        token,
      };
    }
  );
}

export default fp(plugin);
