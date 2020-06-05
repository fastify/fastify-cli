import AutoLoad from 'fastify-autoload';
import * as path from 'path';
import { FastifyInstance } from 'fastify';

export default function (fastify: FastifyInstance, opts: any, next: Function) {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: opts
  })

  // This loads all plugins defined in services
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'services'),
    options: opts
  })

  // Make sure to call next when done
  next()
}
