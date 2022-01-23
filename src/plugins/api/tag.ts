import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";

async function plugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const tagService = fastify.service.tag;

  const newTagJsonSchema = {
    body: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" },
        },
      },
    },
  };

  fastify.post(
    "/tags",
    { schema: newTagJsonSchema },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
        };
      }>,
      reply
    ) => {
      const userId = request.auth.userId;
      const { name } = request.body;

      const newTag = await tagService.createTag(userId, name);

      return newTag;
    }
  );

  const singleTagJsonSchema = {
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
        },
      },
    },
  };

  fastify.get(
    "/tags/:id",
    { schema: singleTagJsonSchema },
    async (request: FastifyRequest<{ Params: { id: number } }>, reply) => {
      const userId = request.auth.userId;
      const { id } = request.params;

      const tag = await tagService.getTag(userId, id);

      return tag;
    }
  );

  const multipleTagJsonSchema = {
    querystring: {
      type: "object",
      properties: {
        phrase: { type: "string" },
      },
    },
    response: {
      200: {
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
  };

  fastify.get(
    "/tags",
    { schema: multipleTagJsonSchema },
    async (
      request: FastifyRequest<{
        Querystring: {
          phrase: string;
        };
      }>,
      reply
    ) => {
      const userId = request.auth.userId;
      const { phrase } = request.query;

      const tags = await tagService.getTags(userId, phrase);

      return tags;
    }
  );

  const singleTagUpdateJsonSchema = {
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
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" },
        },
      },
    },
  };

  fastify.put(
    "/tags/:id",
    { schema: singleTagUpdateJsonSchema },
    async (
      request: FastifyRequest<{
        Params: { id: number };
        Body: {
          name: string;
        };
      }>,
      reply
    ) => {
      const userId = request.auth.userId;
      const { id } = request.params;
      const { name } = request.body;

      const updatedTag = await tagService.updateTag(userId, id, name);

      return updatedTag;
    }
  );

  const singleTagDeleteJsonSchema = {
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

  fastify.delete(
    "/tags/:id",
    { schema: singleTagDeleteJsonSchema },
    async (request: FastifyRequest<{ Params: { id: number } }>, reply) => {
      const { id } = request.params;
      const userId = request.auth.userId;

      const deletedTagId = await tagService.deleteTag(userId, id);

      return {
        id: deletedTagId,
      };
    }
  );
}

export default plugin;
