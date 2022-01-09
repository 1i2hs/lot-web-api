async function start() {
  const server = await require("../src/app")({
    logger: {
      prettyPrint: process.env.NODE_ENV === "production" ? false : true,
    },
  });
  server.listen(3000, (error, address) => {
    if (error) {
      server.log.error(error);
      process.exit(1);
    }
  });
}

start();
