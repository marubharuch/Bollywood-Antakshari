import { io } from 'socket.io-client'

/**
 * @param {string} serverUrl
 * @param {{ onState?: Function, onWinner?: Function, onRejected?: Function, onError?: Function, onConnection?: Function }} handlers
 */
export function createBuzzerSocket(serverUrl, handlers = {}) {
  const socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 8,
    timeout: 8000,
  })

  socket.on('connect', () => handlers.onConnection?.('connected'))
  socket.on('disconnect', () => handlers.onConnection?.('disconnected'))
  socket.on('connect_error', (err) => {
    handlers.onConnection?.('error', err?.message ?? 'Connection failed')
  })
  socket.on('state', (state) => handlers.onState?.(state))
  socket.on('buzz:winner', (winner) => handlers.onWinner?.(winner))
  socket.on('buzz:rejected', (data) => handlers.onRejected?.(data))
  socket.on('error', (data) => handlers.onError?.(data?.message ?? 'Server error'))

  return socket
}

export function registerAdmin(socket) {
  socket.emit('register', { role: 'admin' })
}

export function registerClient(socket, teamId, teamName) {
  socket.emit('register', { role: 'client', teamId, teamName })
}

export function syncTeams(socket, teams) {
  socket.emit(
    'admin:setTeams',
    teams.map((t) => ({ id: t.id, name: t.name })),
  )
}

export function armBuzzer(socket, questionId) {
  socket.emit('admin:arm', { questionId })
}

export function resetBuzzerServer(socket) {
  socket.emit('admin:reset')
}

export function simulateServerBuzz(socket, teamId) {
  socket.emit('admin:simulateBuzz', { teamId })
}

export function clientBuzz(socket) {
  socket.emit('buzz')
}
