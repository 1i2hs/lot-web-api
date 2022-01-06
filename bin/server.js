async function start() {
  const server = await require("../src/app")({
    logger: true,
    prettyPrint: true,
  });
  server.listen(3000, (error, address) => {
    if (error) {
      server.log.error(error);
      process.exit(1);
    }
  });
}

start();
