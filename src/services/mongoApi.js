// API client – gọi qua Express server (server.js)
// Dev: gọi trực tiếp backend, mặc định localhost:3002
// Production: Express serve cả frontend lẫn API

export const isConfigured = true

const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api')
  : '/api'

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

/** Lấy tất cả sessions */
export async function getAllSessions() {
  return api('GET', '/sessions')
}

/** Lấy danh sách tên người chơi */
export async function getAllPlayers() {
  return api('GET', '/players')
}

/** Lấy danh sách loại chi phí */
export async function getAllExpenseTypes() {
  return api('GET', '/expense-types')
}

/** Lưu một session mới */
export async function insertSession(session) {
  return api('POST', '/sessions', session)
}

/** Xoá một session theo id */
export async function removeSession(id) {
  return api('DELETE', `/sessions/${id}`)
}

/** Cập nhật một session */
export async function updateSession(session) {
  return api('PUT', `/sessions/${session.id}`, session)
}

/** Bulk insert (dùng khi import JSON) */
export async function importSessions(sessions) {
  if (!sessions.length) return
  return api('POST', '/sessions/bulk', sessions)
}

/** Bulk upsert danh sách tên người chơi */
export async function upsertPlayers(names) {
  if (!names.length) return
  return api('POST', '/players/bulk', names)
}

/** Bulk upsert danh sách loại chi phí */
export async function upsertExpenseTypes(types) {
  if (!types.length) return
  return api('POST', '/expense-types/bulk', types)
}
