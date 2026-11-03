import makeMdns from 'multicast-dns'
import os from 'node:os'

const HOSTNAME = 'skyjo.local'
const PORT = Number(process.env.PORT ?? 3000)

/**
 * Adverteert de host als `skyjo.local` op het lokale netwerk via mDNS,
 * zodat telefoons de server kunnen bereiken zonder IP-adres of internet.
 */
export function startMdns(): void {
  const mdns = makeMdns()

  // Bepaal het eerste niet-interne IPv4-adres van deze machine.
  const localIp = getLocalIpv4()

  mdns.on('query', (query) => {
    const wantsUs = query.questions.some(
      (q) => q.name === HOSTNAME && q.type === 'A',
    )

    if (wantsUs && localIp) {
      mdns.respond({
        answers: [
          {
            name: HOSTNAME,
            type: 'A',
            ttl: 300,
            data: localIp,
          },
        ],
      })
    }
  })

  // eslint-disable-next-line no-console
  console.log(`mDNS adverteert ${HOSTNAME} -> ${localIp ?? 'onbekend'}:${PORT}`)
}

function getLocalIpv4(): string | null {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return null
}
