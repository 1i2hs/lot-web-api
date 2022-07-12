import { FastifyInstance, FastifyPluginOptions } from "fastify";
import * as pg from "pg";
import fp from "fastify-plugin";
import config from "../config";
import { PostgreSQLPool } from "../data-access";
import { ItemModule, TagModule } from "../core";
import { ItemService, TagService } from "../service";
import { AppError, commonErrors } from "../error";
import AuthorizationService from "../service/AuthorizationService";

declare module "fastify" {
  export interface FastifyInstance {
    service: {
      authz: AuthorizationService;
      item: ItemService;
      tag: TagService;
    };
    authUser: (
      request: FastifyRequest,
      reply: FastifyReply,
      done: () => void
    ) => void;
  }
  export interface FastifyRequest {
    userId: string;
  }
}

async function plugin(fastify: FastifyInstance, option: FastifyPluginOptions) {
  const pgPool = new pg.Pool({
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    max: config.db.poolSize,
  });

  // data-access
  const sqlPool = new PostgreSQLPool(pgPool, fastify.log);

  // if (!(await sqlPool.isConnected())) {
  //   throw new AppError(
  //     commonErrors.databaseError,
  //     "Cannot connect to the DB. Please check the status of the DB",
  //     false,
  //     500
  //   );
  // }
  fastify.log.info("DB Connection Ready");

  fastify.addHook("onClose", async (instance) => {
    await sqlPool.disconnect();
    fastify.log.info("All connections of the DB pool are closed successfully");
  });

  // module
  const itemModule = new ItemModule(sqlPool, fastify.log);
  const tagModule = new TagModule(sqlPool, fastify.log);

  // service
  const authorizationService = new AuthorizationService(fastify.log);
  const itemService = new ItemService(itemModule, fastify.log);
  const tagService = new TagService(tagModule, fastify.log);

  fastify.decorate("service", {
    authz: authorizationService,
    item: itemService,
    tag: tagService,
  });
}

export default fp(plugin);
