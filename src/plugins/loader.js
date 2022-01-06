const pg = require("pg");
const fp = require("fastify-plugin");

const config = require("../config");
const dataAccess = require("../data-access");
const core = require("../core");
const service = require("../service");

async function plugin(fastify, option) {
  const pgPool = new pg.Pool({
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    max: config.db.poolSize,
  });

  // data-access
  const { PostgreSQLPool } = dataAccess;

  const sqlPool = new PostgreSQLPool(pgPool);

  // module
  const { ItemModule } = core;

  const itemModule = new ItemModule(sqlPool, fastify.log);

  fastify.decorate("module", {
    item: itemModule,
  });

  const { ItemService } = service;

  const itemService = new ItemService(itemModule, fastify.log);

  fastify.decorate("service", {
    item: itemService,
  });
}

module.exports = fp(plugin);
