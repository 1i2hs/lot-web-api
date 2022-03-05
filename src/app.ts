import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import cors from "fastify-cors";
import helmet from "fastify-helmet";
import cookie from "fastify-cookie";
import csrf from "fastify-csrf";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import loaderPlugin from "./plugins/loader";
import apiPlugins from "./plugins/api";
import config from "./config";

import { ErrorHandler } from "./error";

async function build(option: FastifyServerOptions) {
  dayjs.extend(utc);

  const app = fastify(option);

  const errorHandler = new ErrorHandler(app.log);

  app.setErrorHandler(async (error, request, reply) => {
    await errorHandler.handleError(error, request, reply);

    // if (
    //   error.hasOwnProperty("validation") &&
    //   error.validation !== undefined &&
    //   error.validation?.length > 0
    // ) {
    //   return;
    // }

    // if (!errorHandler.isTrustedError(error)) {
    //   await closeServer(app);
    //   process.exit(1);
    // }
  });

  app.register(cors, (instance) => async (req, callback) => {
    const corsOptions = {
      methods: ["GET", "PUT", "POST", "DELETE"],
      credentials: true, // to provide Cookies or other credentials to the client with different origin
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "x-csrf-token",
      ],
      origin: false,
    };
    // do not include CORS headers for requests from localhost
    const originHostname = req.headers.origin || req.ip || "";
    if (/(localhost|ngrok|127.0.0.1)/g.test(originHostname)) {
      corsOptions.origin = true;
    } else {
      corsOptions.origin = false;
    }
    callback(null, corsOptions); // callback expects two parameters: error and options
  });

  app.register(helmet);

  app.register(cookie, { secret: config.cookieSecret });
  app.register(csrf, {
    cookieOpts: { signed: true },
  });

  await app.register(loaderPlugin);

  await app.register(apiPlugins, {
    prefix: "/api",
  });

  app.addHook("onError", (request, reply, error, done) => {
    // Some code
    // sentry
    done();
  });

  return app;
}

function closeServer(app: FastifyInstance) {
  const logger = app.log;

  logger.info("Initiating graceful shutdown of the server");
  logger.info(
    "All incoming requests will receive HTTP STATUS code 503 from now..."
  );

  return app
    .close()
    .then(() => {
      logger.info("All cleanups are done 🟢");
      logger.info("The server is successfully closed 🟢");
      logger.info("The graceful shutdown process has been completed 🟢");
      logger.info("Terminating the process... ⏳");
      logger.info("Bye 👋");
    })
    .catch((error) => {
      logger.error(error);
      logger.error("The graceful shutdown process has been failed 🔴");
      logger.error("Terminating the process with force...⏳");
      process.exit(1);
    });
}

export { build, closeServer };
