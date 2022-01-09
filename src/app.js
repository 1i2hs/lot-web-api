const fastify = require("fastify");
const cors = require("fastify-cors");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

const loaderPlugin = require("./plugins/loader");
const apiPlugins = require("./plugins/api");

async function build(option) {
  dayjs.extend(utc);

  const app = fastify(option);

  app.register(cors, (instance) => async (req, callback) => {
    const corsOptions = {
      credentials: true,
      allowedHeaders: ["Origin, X-Requested-With, Content-Type, Accept"],
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

// process.on('uncaughtException', (error) => {
//   // I just received an error that was never handled, time to handle it and then decide whether a restart is needed
//   errorManagement.handler.handleError(error);
//   if (!errorManagement.handler.isTrustedError(error))
//     process.exit(1);
// });

// process.on('unhandledRejection', (reason, p) => {
//   // I just caught an unhandled promise rejection,
//   // since we already have fallback handler for unhandled errors (see below),
//   // let throw and let him handle that
//   throw reason;
// });

module.exports = build;
