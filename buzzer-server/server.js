import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = Number(process.env.PORT) || 3847
const HOST = process.env.HOST || '0.0.0.0'

/** @type {{ questionId: number, phase: 'idle'|'armed'|'locked', teams: {id:string,name:string}[], winner: object|null, buzzedTeamIds: Set<string> }} */
const room = {
  questionId: 0,
  phase: 'idle',
  teams: [],
  winner: null,
  buzzedTeamIds: new Set(),
}

function publicState() {
  return {
    questionId: room.questionId,
    phase: room.phase,
    teams: room.teams,
    winner: room.winner,
  }
}

function resetForQuestion(questionId) {
  room.questionId = questionId ?? room.questionId + 1
  room.phase = 'armed'
  room.winner = null
  room.buzzedTeamIds = new Set()
}

function tryAcceptBuzz(teamId, teamName, meta = {}) {
  if (room.phase !== 'armed') {
    return { ok: false, reason: 'not_armed' }
  }
  if (room.winner) {
    return { ok: false, reason: 'locked' }
  }
  if (!room.teams.some((t) => t.id === teamId)) {
    return { ok: false, reason: 'invalid_team' }
  }
  if (room.buzzedTeamIds.has(teamId)) {
    return { ok: false, reason: 'already_buzzed' }
  }

  room.winner = {
    teamId,
    teamName,
    serverTime: Date.now(),
    order: 1,
    ...meta,
  }
  room.phase = 'locked'
  room.buzzedTeamIds.add(teamId)
  return { ok: true, winner: room.winner }
}

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, phase: room.phase }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Bollywood Antakshari buzzer server. Use Socket.io from the web app.')
})

const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
  pingInterval: 10000,
  pingTimeout: 20000,
})

io.on('connection', (socket) => {
  socket.emit('state', publicState())

  socket.on('register', (payload) => {
    if (!payload || typeof payload !== 'object') {
      socket.emit('error', { message: 'Invalid register payload.' })
      return
    }
    const { role, teamId, teamName } = payload
    if (role === 'admin') {
      socket.data.role = 'admin'
      socket.join('admins')
      socket.emit('registered', { role: 'admin' })
      socket.emit('state', publicState())
      return
    }
    if (role === 'client') {
      if (!teamId || typeof teamId !== 'string') {
        socket.emit('error', { message: 'Select a valid team.' })
        return
      }
      const team = room.teams.find((t) => t.id === teamId)
      if (!team) {
        socket.emit('error', { message: 'Team not found on server. Ask admin to sync teams.' })
        return
      }
      socket.data.role = 'client'
      socket.data.teamId = teamId
      socket.data.teamName = teamName || team.name
      socket.join('clients')
      socket.emit('registered', { role: 'client', teamId, teamName: socket.data.teamName })
      socket.emit('state', publicState())
      return
    }
    socket.emit('error', { message: 'Unknown role.' })
  })

  socket.on('admin:setTeams', (teams) => {
    if (socket.data.role !== 'admin') return
    if (!Array.isArray(teams)) return
    room.teams = teams
      .filter((t) => t && typeof t.id === 'string' && typeof t.name === 'string')
      .map((t) => ({ id: t.id, name: t.name }))
    io.emit('state', publicState())
  })

  socket.on('admin:arm', (payload) => {
    if (socket.data.role !== 'admin') return
    const qid = payload?.questionId
    resetForQuestion(typeof qid === 'number' ? qid : undefined)
    io.emit('state', publicState())
  })

  socket.on('admin:reset', () => {
    if (socket.data.role !== 'admin') return
    room.phase = 'idle'
    room.winner = null
    room.buzzedTeamIds = new Set()
    io.emit('state', publicState())
  })

  socket.on('buzz', () => {
    if (socket.data.role !== 'client') {
      socket.emit('buzz:rejected', { reason: 'not_client' })
      return
    }
    const result = tryAcceptBuzz(socket.data.teamId, socket.data.teamName, {
      socketId: socket.id,
    })
    if (!result.ok) {
      socket.emit('buzz:rejected', { reason: result.reason })
      io.emit('state', publicState())
      return
    }
    io.emit('buzz:winner', { ...result.winner, questionId: room.questionId })
    io.emit('state', publicState())
  })

  socket.on('admin:simulateBuzz', (payload) => {
    if (socket.data.role !== 'admin') return
    const teamId = payload?.teamId
    const team = room.teams.find((t) => t.id === teamId)
    if (!team) {
      socket.emit('error', { message: 'Invalid team for simulation.' })
      return
    }
    const result = tryAcceptBuzz(team.id, team.name, { simulated: true })
    if (!result.ok) {
      socket.emit('buzz:rejected', { reason: result.reason })
      return
    }
    io.emit('buzz:winner', { ...result.winner, questionId: room.questionId })
    io.emit('state', publicState())
  })

  socket.on('disconnect', () => {
    // state unchanged; clients can reconnect and re-register
  })
})

httpServer.listen(PORT, HOST, () => {
  console.log(`Buzzer server listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`)
  console.log(`LAN access: use your laptop IP with port ${PORT}`)
})
