const AbstractDBPool = require("./AbstractDBPool");

class PostgreSQLPool extends AbstractDBPool {
  constructor(pgPool) {
    super(pgPool);
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async getClient() {
    const client = await this.pool.connect();
    return client;
  }

  async disconnect() {
    this.pool.end();
  }
}

module.exports = PostgreSQLPool;
