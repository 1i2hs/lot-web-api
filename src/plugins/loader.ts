import { FastifyInstance, FastifyPluginOptions } from "fastify";
import * as pg from "pg";
import fp from "fastify-plugin";
import config from "../config";
import { PostgreSQLPool } from "../data-access";
import { ItemModule } from "../core";
import { ItemService } from "../service";

// const dataAccess = require("../data-access");
// const core = require("../core");
// const service = require("../service");

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
  const sqlPool = new PostgreSQLPool(pgPool);

  fastify.addHook("onClose", async (instance) => {
    await sqlPool.disconnect();
    fastify.log.info("All connections of the DB pool are closed successfully");
  });

  // module
  const itemModule = new ItemModule(sqlPool, fastify.log);

  fastify.decorate("module", {
    item: itemModule,
  });

  // service
  const itemService = new ItemService(itemModule, fastify.log);

  fastify.decorate("service", {
    item: itemService,
  });
}

export default fp(plugin);
