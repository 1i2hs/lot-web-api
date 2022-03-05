import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import { Tag } from "../../model";
import { ItemCursorBase } from "../../types";

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

  fastify.post<{
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
  }>(
    "/items",
    { schema: newItemJsonSchema, onRequest: fastify.csrfProtection },
    async (request, reply) => {
      const userId = request.userId;
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
          currentValue: { type: "number" },
          lifeSpanLeft: { type: "number" },
          lifePercentage: { type: "number" },
        },
      },
    },
  };

  fastify.get<{ Params: { id: number } }>(
    "/items/:id",
    { schema: singleItemJsonSchema },
    async (request, reply) => {
      const userId = request.userId;
      const { id } = request.params;

      const item = await itemService.getItem(userId, id);

      return item;
    }
  );

  const multipleItemJsonSchema = {
    querystring: {
      type: "object",
      properties: {
        cursor: { type: ["number", "string"] },
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
        name: { type: "string" },
        alias: { type: "string" },
        purchasedTimeRangeMin: { type: "number" },
        purchasedTimeRangeMax: { type: "number" },
        valueRangeMin: { type: "number" },
        valueRangeMax: { type: "number" },
        currencyCode: {
          type: "string",
        },
        lifeSpanRangeMin: { type: "number" },
        lifeSpanRangeMax: { type: "number" },
        isFavorite: {
          type: "boolean",
        },
        isArchived: {
          type: "boolean",
        },
        currentValueMin: { type: "number" },
        currentValueMax: { type: "number" },
        lifeSpanLeftMin: { type: "number" },
        lifeSpanLeftMax: { type: "number" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          total: { type: "number" },
          cursor: { type: "number" },
          data: {
            type: "array",
            items: {
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
                currentValue: { type: "number" },
                lifeSpanLeft: { type: "number" },
                lifePercentage: { type: "number" },
              },
            },
          },
        },
      },
    },
  };

  fastify.get<{
    Querystring: {
      cursor: number | string;
      base: ItemCursorBase;
      order: "ASC" | "DESC";
      name: string;
      alias: string;
      purchasedTimeRangeMin: number;
      purchasedTimeRangeMax: number;
      valueRangeMin: number;
      valueRangeMax: number;
      currencyCode: string;
      lifeSpanRangeMin: number;
      lifeSpanRangeMax: number;
      isFavorite: boolean;
      isArchived: boolean;
      currentValueMin: number;
      currentValueMax: number;
      lifeSpanLeftMin: number;
      lifeSpanLeftMax: number;
    };
  }>("/items", { schema: multipleItemJsonSchema }, async (request, reply) => {
    const userId = request.userId;
    const {
      cursor,
      base,
      order,
      name,
      alias,
      purchasedTimeRangeMin,
      purchasedTimeRangeMax,
      valueRangeMin,
      valueRangeMax,
      currencyCode,
      lifeSpanRangeMin,
      lifeSpanRangeMax,
      isFavorite,
      isArchived,
      currentValueMin,
      currentValueMax,
      lifeSpanLeftMin,
      lifeSpanLeftMax,
    } = request.query;

    const items = await itemService.getItems(userId, {
      cursor: { base, order, value: cursor },
      name,
      alias,
      purchasedTimeRange: {
        min: purchasedTimeRangeMin,
        max: purchasedTimeRangeMax,
      },
      valueRange: {
        min: valueRangeMin,
        max: valueRangeMax,
      },
      lifeSpanRange: {
        min: lifeSpanRangeMin,
        max: lifeSpanRangeMax,
      },
      currencyCode,
      isFavorite,
      isArchived,
      currentValueRange: {
        min: currentValueMin,
        max: currentValueMax,
      },
      lifeSpanLeftRange: {
        min: lifeSpanLeftMin,
        max: lifeSpanLeftMax,
      },
    });

    return items;
  });

  const singleItemUpdateJsonSchema = {
    params: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
      },
    },
    body: {
      type: "object",
      properties: {
        name: { type: "string" },
        alias: { type: "string" },
        description: { type: "string" },
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
          currentValue: { type: "number" },
          lifeSpanLeft: { type: "number" },
          lifePercentage: { type: "number" },
        },
      },
    },
  };

  fastify.put<{
    Params: { id: number };
    Body: {
      name: string;
      alias: string;
      description: string;
      purchasedAt: number;
      value: number;
      currencyCode: string;
      lifeSpan: number;
      isFavorite: boolean;
      isArchived: boolean;
      tags: Array<Tag>;
    };
  }>(
    "/items/:id",
    { schema: singleItemUpdateJsonSchema, onRequest: fastify.csrfProtection },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.userId;
      const {
        name,
        alias,
        description,
        purchasedAt,
        value,
        currencyCode,
        lifeSpan,
        isFavorite,
        isArchived,
        tags,
      } = request.body;

      const updatedItem = await itemService.updateItem(userId, id, {
        name,
        alias,
        description,
        purchasedAt,
        value,
        currencyCode,
        lifeSpan,
        isFavorite,
        isArchived,
        tags,
      });

      return updatedItem;
    }
  );

  const singleItemDeleteJsonSchema = {
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
        },
      },
    },
  };

  fastify.delete<{ Params: { id: number } }>(
    "/items/:id",
    { schema: singleItemDeleteJsonSchema, onRequest: fastify.csrfProtection },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.userId;

      const deletedItemId = await itemService.deleteItem(userId, id);

      return {
        id: deletedItemId,
      };
    }
  );
}

export default plugin;
