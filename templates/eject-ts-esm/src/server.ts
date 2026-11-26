import Fastify from 'fastify'
import closeWithGrace from 'close-with-grace'
import App from './app.js'

try {
  process.loadEnvFile()
} catch {}

const app = Fastify({ logger: true })
app.register(App)

closeWithGrace({ delay: Number(process.env.FASTIFY_CLOSE_GRACE_DELAY) || 500 }, async ({ err }) => {
  if (err) app.log.error(err)
  await app.close()
})

app.listen({ port: Number(process.env.PORT ?? 3000) }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
