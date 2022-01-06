const { AppError, commonErrors } = require("../error");

class AbstractDBPool {
  constructor(pool) {
    if (pool === undefined || pool === null) {
      throw new AppError(
        commonErrors.argumentError,
        `Missing argument 'pool' to create DB Client instance`
      );
    }
    this.pool = pool;
  }

  async query(text, params) {
    throw new AppError(
      commonErrors.objectCreationError,
      `A method query() must be implemented by child class`
    );
  }

  async getClient() {
    throw new AppError(
      commonErrors.objectCreationError,
      `A method getClient() must be implemented by child class`
    );
  }

  async disconnect() {
    throw new AppError(
      commonErrors.objectCreationError,
      `A method disconnect() must be implemented by child class`
    );
  }
}

module.exports = AbstractDBPool;
