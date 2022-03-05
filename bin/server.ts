import GracefulServer from "@gquittet/graceful-server";
import * as app from "../src/app";
import { ErrorHandler } from "../src/error";
import config from "../src/config";

async function start() {
  const errorHandler = new ErrorHandler(console);

  const fastifyApp = await app.build({
    logger: {
      prettyPrint: process.env.NODE_ENV === "production" ? false : true,
      level: config.logs.level,
    },
  });

  const gracefulServer = GracefulServer(fastifyApp.server, {
    kubernetes: true,
  });

  gracefulServer.on(GracefulServer.SHUTTING_DOWN, () => {
    app.closeServer(fastifyApp);
  });

  gracefulServer.on(GracefulServer.SHUTDOWN, (error) => {
    console.log(`Server is down because of`, error.message);
  });

  fastifyApp.listen(3100, (error) => {
    if (error) {
      fastifyApp.log.error(error);
      process.exit(1);
    }
    gracefulServer.setReady();
  });

  process.on("unhandledRejection", (reason, p) => {
    // I just caught an unhandled promise rejection,
    // since we already have fallback handler for unhandled errors (see below),
    // let throw and let him handle that
    throw reason;
  });

  process.on("uncaughtException", async (error) => {
    // I just received an error that was never handled, time to handle it and then decide whether a restart is needed
    await errorHandler.handleError(error);
    if (!errorHandler.isTrustedError(error)) {
      await app.closeServer(fastifyApp);
      process.exit(1);
    }
  });
}

start();
