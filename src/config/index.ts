import * as dotenv from "dotenv";
import { AppError, commonErrors } from "../error";

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
console.log(`Initiating the application with env: ${process.env.NODE_ENV}`);

const envFound = dotenv.config();
if (envFound.error) {
  // This error should crash whole process
  throw new AppError(
    commonErrors.configError,
    "Couldn't find .env file",
    false
  );
}

if (process.env.JWT_SECRET === undefined || process.env.JWT_SECRET === null) {
  throw new AppError(
    commonErrors.configError,
    `JWT secret key is not provided. the key must be provided through an enviroment variable: JWT_SECRET`,
    false
  );
}

export default {
  /**
   * Your application name
   */
  applicationName: process.env.APPLICATION_NAME || "app",
  /**
   * Your favorite port
   */
  port: parseInt(process.env.PORT ?? "3000", 10),

  db: {
    user: process.env.POSTGRESQL_USER,
    password: process.env.POSTGRESQL_PASSWORD,
    host: process.env.POSTGRESQL_HOST,
    database: process.env.POSTGRESQL_DATABASE,
    port: Number(process.env.POSTGRESQL_PORT),
    poolSize: Number(process.env.POSTGRESQL_POOL_SIZE),
  },

  /**
   * Your secret sauce
   */
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || 24 * 60, // in seconds (default 24 hours)
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION || 3 * 24 * 60, // in seconds (default 3 days)
  },

  /**
   * Used by pino logger
   */
  logs: {
    level: process.env.LOG_LEVEL ?? "silly",
  },
  /**
   * API configs
   */
  api: {
    prefix: "/api",
  },

  cookieSecret: process.env.COOKIE_SECRET,

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? "demo",
  },
};
