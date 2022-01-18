import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { ItemService } from "../../service";
import { Tag } from "../../model";

declare module "fastify" {
  export interface FastifyInstance {
    service: {
      item: ItemService;
    };
  }
  export interface FastifyRequest {
    auth: {
      userId: string;
    };
  }
}

async function plugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const itemService = fastify.service.item;

  const newItemJsonSchema = {
    body: {
      type: "object",
      required: ["name", "purchasedAt", "value", "currencyCode", "lifeSpan"],
      properties: {
        name: { type: "string" },
        alias: { type: "string" },
        description: { type: "string" },
        purchasedAt: { type: "number" },
        value: { type: "number" },
        currencyCode: { type: "string" },
        lifeSpan: { type: "number" },
        tags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              name: { type: "string" },
            },
          },
        },
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

  fastify.post(
    "/items",
    { schema: newItemJsonSchema },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          alias: string;
          description: string;
          purchasedAt: number;
          value: number;
          currencyCode: string;
          lifeSpan: number;
          tags: Array<Tag>;
        };
      }>,
      reply
    ) => {
      const userId = request.auth.userId;
      const {
        name,
        alias,
        description,
        purchasedAt,
        value,
        currencyCode,
        lifeSpan,
        tags,
      } = request.body;

      const newItem = await itemService.createItem(
        userId,
        name,
        alias,
        description,
        purchasedAt,
        value,
        currencyCode,
        lifeSpan,
        tags ?? []
      );

      return newItem;
    }
  );

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
          tags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
  };

  fastify.get(
    "/items/:id",
    { schema: singleItemJsonSchema },
    async (request: FastifyRequest<{ Params: { id: number } }>, reply) => {
      const userId = request.auth.userId;
      const { id } = request.params;

      console.log(userId, id);
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
            base: {
              type: "string",
              enum: [
                "added_at",
                "name",
                "alias",
                "purchased_at",
                "value",
                "life_span",
                "current_value",
                "life_span_left",
              ],
            },
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
      // const {
      //   cursor, // TODO destructure this to make it compatible with query string
      //   name,
      //   alias,
      //   description,
      //   addedAt,
      //   updatedAt,
      //   purchasedAt,
      //   value,
      //   currencyCode,
      //   lifeSpan,
      //   isFavorite,
      //   isArchived,
      // } = request.query;

      // const items = await itemService.getItems(userId, {
      //   cursor,
      //   name,
      //   alias,
      //   description,
      //   addedAt,
      //   updatedAt,
      //   purchasedAt,
      //   value,
      //   currencyCode,
      //   lifeSpan,
      //   isFavorite,
      //   isArchived,
      // });

      // return items;
      return { msg: "hello world" };
    }
  );

  fastify.put(
    "/items/:id",
    async (request: FastifyRequest<{ Params: { id: number } }>, reply) => {
      const { id } = request.params;


      return {
        msg: `PUT /items/${id}`,
      };
    }
  );

  fastify.delete(
    "/items/:id",
    async (request: FastifyRequest<{ Params: { id: number } }>, reply) => {
      const { id } = request.params;
      return {
        msg: `DELETE /items/${id}`,
      };
    }
  );

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

export default plugin;
