import * as app from "../src/app";
import { ErrorHandler } from "../src/error";
import config from "../src/config";

async function start() {
  const server = await app.build({
    logger: {
      prettyPrint: process.env.NODE_ENV === "production" ? false : true,
      level: config.logs.level,
    },
  });

  server.listen(3000, (error) => {
    if (error) {
      server.log.error(error);
      process.exit(1);
    }
  });

  const errorHandler = new ErrorHandler(console);

  process.on("SIGINT", () => {
    console.log("SIGINT");
    app.closeServer(server);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM");
    app.closeServer(server);
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
      await app.closeServer(server);
      process.exit(1);
    }
  });
}

start();
