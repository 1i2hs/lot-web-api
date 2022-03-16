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

  fastify.post<{
    Body: {
      name: string;
    };
  }>(
    "/tags",
    {
      schema: newTagJsonSchema,
      onRequest: [fastify.csrfProtection, fastify.authUser],
    },
    async (request, reply) => {
      const userId = request.userId;
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

  fastify.get<{ Params: { id: number } }>(
    "/tags/:id",
    {
      schema: singleTagJsonSchema,
      onRequest: [fastify.csrfProtection, fastify.authUser],
    },
    async (request, reply) => {
      const userId = request.userId;
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

  fastify.get<{
    Querystring: {
      phrase: string;
    };
  }>(
    "/tags",
    {
      schema: multipleTagJsonSchema,
      onRequest: [fastify.csrfProtection, fastify.authUser],
    },
    async (request, reply) => {
      const userId = request.userId;
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

  fastify.patch<{
    Params: { id: number };
    Body: {
      name: string;
    };
  }>(
    "/tags/:id",
    {
      schema: singleTagUpdateJsonSchema,
      onRequest: [fastify.csrfProtection, fastify.authUser],
    },
    async (request, reply) => {
      const userId = request.userId;
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

  fastify.delete<{ Params: { id: number } }>(
    "/tags/:id",
    {
      schema: singleTagDeleteJsonSchema,
      onRequest: [fastify.csrfProtection, fastify.authUser],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.userId;

      const deletedTagId = await tagService.deleteTag(userId, id);

      return {
        id: deletedTagId,
      };
    }
  );
}

export default plugin;
