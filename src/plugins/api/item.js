async function plugin(fastify, options) {
  const itemService = fastify.service.item;

  fastify.post("/items", async (request, reply) => {
    return {
      msg: "POST /items",
    };
  });

  const singleItemJsonSchema = {
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" },
          alias: { type: "string" },
          description: { type: "string" },
          addedAt: { type: "number" },
          updatedAt: { type: "number" },
          purchasedAt: { type: "number" },
          value: { type: "number" },
          currencyCode: { type: "string" },
          lifeSpan: { type: "number" },
          isFavorite: { type: "boolean" },
          isArchived: { type: "boolean" },
        },
      },
    },
  };

  fastify.get(
    "/items/:id",
    { schema: singleItemJsonSchema },
    async (request, reply) => {
      const userId = request.auth.userId;
      const { id } = request.params;

      const item = await itemService.getItem(userId, id);

      return item;
    }
  );

  const multipleItemJsonSchema = {
    querystring: {
      type: "object",
      properties: {
        cursor: {
          type: "object",
          properties: {
            value: { type: ["number", "string"] },
            base: { type: "string", enum: ["added_at", "name", "alias", "purchased_at", "value", "life_span", "current_value", "life_span_left"] },
            order: { type: "string", enum: ["ASC", "DESC"] },
          },
        },
        name: { type: "string" },
        alias: { type: "string" },
        purchasedTimeRange: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
        },
        valueRange: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
        },
        currencyCode: {
          type: "string",
        },
        lifeSpanRange: {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
        },
        isFavorite: {
          type: "boolean",
        },
        isArchived: {
          type: "boolean",
        },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          cursor: { type: "number" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                alias: { type: "string" },
                description: { type: "string" },
                addedAt: { type: "number" },
                updatedAt: { type: "number" },
                purchasedAt: { type: "number" },
                value: { type: "number" },
                currencyCode: { type: "string" },
                lifeSpan: { type: "number" },
                isFavorite: { type: "boolean" },
                isArchived: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  };

  fastify.get(
    "/items",
    { schema: multipleItemJsonSchema },
    async (request, reply) => {
      const userId = request.auth.userId;
      const {
        cursor, // TODO destructure this to make it compatible with query string
        name,
        alias,
        description,
        addedAt,
        updatedAt,
        purchasedAt,
        value,
        currencyCode,
        lifeSpan,
        isFavorite,
        isArchived,
      } = request.query;

      const items = await itemService.getItems(userId, {
        cursor,
        name,
        alias,
        description,
        addedAt,
        updatedAt,
        purchasedAt,
        value,
        currencyCode,
        lifeSpan,
        isFavorite,
        isArchived,
      });

      return items;
    }
  );

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
