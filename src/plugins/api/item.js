async function plugin(fastify, options) {
  const itemService = fastify.service.item;

  fastify.post("/items", async (request, reply) => {
    return {
      msg: "POST /items",
    };
  });

  fastify.get("/items/:id", async (request, reply) => {
    const { id } = request.params;
    return {
      msg: `GET /items/${id}`,
    };
  });

  fastify.get("/items", async (request, reply) => {
    const { userId, currencyCode } = request.query;
    const items = await itemService.getItems(userId, currencyCode, {});
    return {
      msg: "GET /items",
      data: items,
    };
  });

  fastify.patch("/items/:id", async (request, reply) => {
    const { id } = request.params;
    return {
      msg: `PATCH /items/${id}`,
    };
  });

  fastify.delete("/items/:id", async (request, reply) => {
    const { id } = request.params;
    return {
      msg: `DELETE /items/${id}`,
    };
  });

  // const animalBodyJsonSchema = {
  //   type: "object",
  //   required: ["animal"],
  //   properties: {
  //     animal: { type: "string" },
  //   },
  // };

  // const schema = {
  //   body: animalBodyJsonSchema,
  // };

  // fastify.post("/animals", { schema }, async (request, reply) => {
  //   // we can use the `request.body` object to get the data sent by the client
  //   const result = await collection.insertOne({ animal: request.body.animal });
  //   return result;
  // });
}

module.exports = plugin;
