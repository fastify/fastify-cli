import { FastifyInstance, FastifyPluginCallback } from "fastify";

const plugin: FastifyPluginCallback = function (
  fastify: FastifyInstance,
  opts,
  next
) {
  fastify.decorate("swagger", function () {
    return {
      openapi: "3.0.3",
      info: {
        version: "8.1.0",
        title: "@fastify/swagger",
      },
      components: {
        schemas: {},
      },
      paths: {
        "/": {
          get: {
            responses: {
              200: {
                description: "Default Response",
              },
            },
          },
        },
        "/example/": {
          get: {
            responses: {
              200: {
                description: "Default Response",
              },
            },
          },
        },
      },
    };
  });
  next();
};

export = plugin;
