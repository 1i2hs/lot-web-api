import { FastifyLoggerInstance } from "fastify";
import { Pool, PoolClient } from "pg";
import DBPool from "./DBPool.interface";

class PostgreSQLPool implements DBPool {
  private readonly pool: Pool;
  private readonly logger: FastifyLoggerInstance;

  constructor(pgPool: Pool, logger: FastifyLoggerInstance) {
    this.pool = pgPool;
    this.logger = logger;

    this.pool.on("error", (error: Error, client: PoolClient) => {
      this.logger.error(error);
    });
  }

  public async query(text: string, params?: Array<string | number>) {
    const { rows } = await this.pool.query(text, params);
    return rows;
  }

  public async isConnected(): Promise<boolean> {
    const { rows } = await this.pool
      .query("SELECT 'hello, world'")
      .catch((error) => {
        this.logger.error(error);
        return { rows: [] };
      });
    return rows.length > 0;
  }

  public async getClient() {
    const client = await this.pool.connect();
    return {
      query: async function query(
        text: string,
        params: Array<string | number>
      ) {
        const { rows } = await client.query(text, params);
        return rows;
      },
      release: function () {
        client.release();
      },
    };
  }

  public async disconnect() {
    await this.pool.end();
  }
}

export default PostgreSQLPool;
