// End-to-end socket smoke test tegen een draaiende server op :3000.
// Verifieert: create/join/start, initial-flip → playing, privacy (verborgen
// face-down waarden + deck), drawnCard-privacy, en reconnect.
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(resolve(__dirname, '../packages/frontend/package.json'))
const { io } = require('socket.io-client')

const URL = 'http://localhost:3000'
const log = (...a) => console.log(...a)
let failures = 0
function check(cond, msg) {
  if (cond) log('  ✓', msg)
  else {
    failures++
    log('  ✗ FAIL:', msg)
  }
}

function connect() {
  return io(URL, { transports: ['websocket'], forceNew: true })
}
const onceEv = (s, ev) => new Promise((res) => s.once(ev, res))
// Wacht op een state-update die aan predicate voldoet (luistert continu).
function waitState(s, pred) {
  return new Promise((res) => {
    const h = (payload) => {
      if (pred(payload.state)) {
        s.off('state-update', h)
        res(payload.state)
      }
    }
    s.on('state-update', h)
  })
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function allGridsHidden(state) {
  return state.players.every((p) =>
    p.grid.every((row) => row.every((c) => c.faceUp || c.value === 0)),
  )
}

async function main() {
  // 1. Host maakt kamer
  const p1 = connect()
  await onceEv(p1, 'connect')
  p1.emit('create-room', { playerName: 'P1' })
  const created = await onceEv(p1, 'room-created')
  const roomCode = created.roomCode
  check(!!roomCode, `kamer aangemaakt (${roomCode})`)

  // 2. Tweede speler joint
  const p2 = connect()
  await onceEv(p2, 'connect')
  const p2joined = waitState(p2, (st) => st.players.length === 2)
  p2.emit('join-room', { playerName: 'P2', roomCode })
  const lobbyState = await p2joined
  check(lobbyState.players.length === 2, '2 spelers in de lobby')
  const p2Id = lobbyState.players.find((pl) => pl.name === 'P2').id

  // 3. Host start
  const p2Started = onceEv(p2, 'game-started')
  p1.emit('start-game')
  const started = (await p2Started).state
  check(started.phase === 'initial-flip', 'fase = initial-flip na start')

  // 4. Privacy: face-down waarden + deck verborgen in broadcast
  check(allGridsHidden(started), 'face-down kaartwaarden verborgen voor andere speler')
  check(
    started.deck.every((c) => c.value === 0),
    'trekstapel-waarden verborgen',
  )

  // 5. Beide spelers draaien 2 kaarten om (simultaan)
  const reachedPlaying = waitState(p1, (st) => st.phase === 'playing')
  for (const [s, p] of [
    [p1, 'P1'],
    [p2, 'P2'],
  ]) {
    s.emit('flip-initial', { row: 0, col: 0 })
    await sleep(120)
    s.emit('flip-initial', { row: 0, col: 1 })
    await sleep(120)
  }
  const playing = await reachedPlaying
  check(playing.phase === 'playing', 'fase = playing nadat iedereen 2 omdraaide')

  // 6. drawnCard-privacy: huidige speler trekt van deck
  const curId = playing.players[playing.currentPlayerIndex].id
  const cur = playing.players[playing.currentPlayerIndex].name === 'P1' ? p1 : p2
  const other = cur === p1 ? p2 : p1
  const curSaw = waitState(cur, (st) => st.drawnCard !== null)
  const otherSaw = waitState(other, (st) => st.turnStep === 'drawn-card')
  cur.emit('draw-from-deck')
  const curState = await curSaw
  const otherState = await otherSaw
  check(curState.drawnCard !== null, 'huidige speler ziet zijn getrokken kaart')
  check(otherState.drawnCard === null, 'andere speler ziet drawnCard = null (privacy)')

  // huidige speler gooit weg en draait een kaart om → beurt klaar
  cur.emit('discard-drawn-card')
  await waitState(cur, (st) => st.turnStep === 'flip-after-discard')
  const turnPassed = waitState(cur, (st) => st.currentPlayerIndex !== playing.currentPlayerIndex)
  cur.emit('flip-card', { row: 2, col: 3 })
  const afterTurn = await turnPassed
  check(afterTurn.currentPlayerIndex !== playing.currentPlayerIndex, 'beurt ging naar volgende speler')

  // 7. Reconnect: P2 verbreekt en komt terug via rejoin
  p2.disconnect()
  await sleep(300)
  const p2b = connect()
  await onceEv(p2b, 'connect')
  const rejoined = waitState(p2b, (st) => st.players.some((pl) => pl.id === p2Id && pl.isConnected))
  p2b.emit('rejoin', { roomCode, playerId: p2Id })
  const rj = await rejoined
  check(!!rj, 'P2 reconnect ontvangt huidige game state')
  const me = rj.players.find((pl) => pl.id === p2Id)
  check(me && me.isConnected, 'P2 weer gemarkeerd als verbonden')

  p1.disconnect()
  p2b.disconnect()
  log(failures === 0 ? '\nALLE CHECKS GESLAAGD' : `\n${failures} CHECK(S) GEFAALD`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('Smoke test error:', e)
  process.exit(1)
})
