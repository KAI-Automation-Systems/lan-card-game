import path from 'node:path'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { initSocket } from './socket'
import { startMdns } from './mdns'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = '0.0.0.0'

// Pad naar de gebouwde frontend (packages/frontend/dist).
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist')

async function main() {
  const app = Fastify({ logger: true })

  await app.register(fastifyCors, { origin: true })

  // Serveer de frontend build als static files (productie).
  await app.register(fastifyStatic, {
    root: FRONTEND_DIST,
    prefix: '/',
  })

  // SPA fallback: stuur onbekende routes naar index.html.
  app.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html')
  })

  // Socket.io koppelen aan de Fastify HTTP server.
  initSocket(app.server)

  // mDNS advertentie zodat de host bereikbaar is als skyjo.local.
  startMdns()

  try {
    await app.listen({ port: PORT, host: HOST })
    app.log.info(`Skyjo server luistert op http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
