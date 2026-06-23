// Require the framework
import Fastify from 'fastify'

// Require library to exit fastify process, gracefully (if possible)
import closeWithGrace from 'close-with-grace'

// Import your application
import { app as serviceApp, options as serviceOptions} from './app.ts'

// Read and load environment variables from .env files (ignore if not present)
try {
  process.loadEnvFile()
} catch {}

// Instantiate Fastify with some config
const app = Fastify(serviceOptions || {
  logger: true,
})

// Register your application as a normal plugin
app.register(serviceApp)

// delay is the number of milliseconds for the graceful close to finish
closeWithGrace({ delay: parseInt(process.env.FASTIFY_CLOSE_GRACE_DELAY) || 500 }, async function ({ signal, err, manual }) {
  if (err) {
    app.log.error(err)
  }
  await app.close()
} as closeWithGrace.CloseWithGraceAsyncCallback)

// Start listening
app.listen({ port: parseInt(process.env.PORT) || 3000 }, (err: any) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
