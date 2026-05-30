import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json())

// Kết nối MongoDB
const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db('badminton')
const sessions = db.collection('sessions')
const players = db.collection('players')
const expenseTypes = db.collection('expense_types')
const combos = db.collection('combos')

// Keep one document per app-level session id and enforce uniqueness for future writes.
try {
  const duplicates = await sessions.aggregate([
    { $match: { id: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$id',
        docs: {
          $push: {
            _id: '$_id',
            createdAt: '$createdAt',
          },
        },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]).toArray()

  let removedCount = 0
  for (const dup of duplicates) {
    const sorted = (dup.docs || []).slice().sort((a, b) => {
      const ta = Date.parse(String(a.createdAt || '')) || 0
      const tb = Date.parse(String(b.createdAt || '')) || 0
      return tb - ta
    })
    const removeIds = sorted.slice(1).map((d) => d._id)
    if (removeIds.length > 0) {
      const result = await sessions.deleteMany({ _id: { $in: removeIds } })
      removedCount += result.deletedCount || 0
    }
  }

  if (removedCount > 0) {
    console.log(`🧹 Removed duplicate sessions: ${removedCount}`)
  }

  await sessions.createIndex({ id: 1 }, { unique: true, partialFilterExpression: { id: { $exists: true, $ne: null } } })
} catch (e) {
  console.error('Session dedupe/index setup warning:', e.message)
}

console.log('✅ Kết nối MongoDB thành công')

// ── API routes ──────────────────────────────────────────────

// Lấy tất cả sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const docs = await sessions.find({}).sort({ createdAt: -1 }).toArray()

    // Load players map: id (string) -> name
    const playerDocs = await players.find({}).toArray()
    const idToName = new Map()
    const nameToId = new Map()
    for (const p of playerDocs) {
      const key = String(p._id)
      const name = p.name || key
      idToName.set(key, name)
      if (name) nameToId.set(name, key)
    }

    const normalized = docs.map((doc) => {
      const { _id, ...rest } = doc
      const entries = (rest.entries || []).map((entry) => {
        const e = { ...entry }

        // normalize payer: provide both id string, name, and object
        if (e.payer != null) {
          const payerKey = String(e.payer)
          let mappedId = null
          let mappedName = null
          if (idToName.has(payerKey)) {
            mappedId = payerKey
            mappedName = idToName.get(payerKey)
          } else if (nameToId.has(payerKey)) {
            mappedId = nameToId.get(payerKey)
            mappedName = payerKey
          } else {
            mappedId = payerKey
            mappedName = payerKey
          }

          e.payer = { id: mappedId, name: mappedName }
          e.payerId = mappedId
          e.payerName = mappedName
        }

        // normalize people: return array of { id, name } and also peopleNames for compatibility
        if (Array.isArray(e.people)) {
          const ids = e.people.map((p) => String(p))
          e.people = ids.map((pid) => ({ id: pid, name: idToName.get(pid) || pid }))
          e.peopleNames = e.people.map((p) => p.name)
        } else {
          e.people = []
          e.peopleNames = []
        }

        return e
      })

      return { ...rest, entries }
    })

    res.json(normalized)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Thêm 1 session
app.post('/api/sessions', async (req, res) => {
  try {
    const playerDocs = await players.find({}).toArray()
    const nameToId = new Map(playerDocs.map((p) => [String(p.name || '').trim(), String(p._id)]))

    const resolveId = (value) => {
      if (!value && value !== 0) return ''
      if (typeof value === 'object') {
        const rawId = value.id != null ? String(value.id).trim() : ''
        if (rawId) return rawId
        const rawName = String(value.name || '').trim()
        return nameToId.get(rawName) || rawName
      }
      const raw = String(value).trim()
      return nameToId.get(raw) || raw
    }

    const doc = {
      ...req.body,
      createdAt: req.body.createdAt || new Date().toISOString(),
      entries: (req.body.entries || []).map((entry) => ({
        ...entry,
        payer: resolveId(entry.payer),
        people: Array.isArray(entry.people) ? entry.people.map(resolveId).filter(Boolean) : [],
      })),
    }
    if (!doc.id) {
      return res.status(400).json({ error: 'Session id is required' })
    }

    const result = await sessions.updateOne(
      { id: doc.id },
      { $setOnInsert: doc },
      { upsert: true }
    )

    res.json({ ok: true, upserted: result.upsertedCount || 0, existed: result.matchedCount > 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Lấy danh sách tên người chơi
// Players now stored as documents { _id: <id>, name: <string> }
app.get('/api/players', async (req, res) => {
  try {
    const docs = await players.find({}).sort({ name: 1 }).toArray()
    res.json(docs.map((doc) => ({
      id: String(doc._id),
      name: doc.name || String(doc._id),
      avatarSource: doc.avatarSource || '',
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Tạo 1 người chơi duy nhất
app.post('/api/players', async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      return res.status(400).json({ error: 'single_player_only', message: 'Chỉ được tạo 1 người chơi mỗi lần.' })
    }

    const name = String(req.body?.name || '').trim()
    if (!name) {
      return res.status(400).json({ error: 'invalid_player_name', message: 'Tên người chơi không hợp lệ.' })
    }
    const existing = await players.findOne({ name })
    const avatarSource = String(req.body?.avatarSource || req.body?.avatar || '').trim()

    if (existing) {
      const nextAvatarSource = avatarSource || existing.avatarSource || ''
      if (avatarSource || Object.prototype.hasOwnProperty.call(req.body || {}, 'avatarSource') || Object.prototype.hasOwnProperty.call(req.body || {}, 'avatar')) {
        await players.updateOne({ _id: existing._id }, { $set: { avatarSource: nextAvatarSource } })
      }
      return res.json({ ok: true, existed: true, player: { id: existing._id, name: existing.name || name, avatarSource: nextAvatarSource } })
    }

    const id = String(req.body?.id || '').trim() || randomUUID()
    const player = { _id: id, name, avatarSource }

    await players.insertOne(player)

    res.status(201).json({ ok: true, created: true, player: { id: player._id, name: player.name, avatarSource: player.avatarSource || '' } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk upsert danh sách tên người chơi (key chính là tên)
app.post('/api/players/bulk', async (req, res) => {
  // Bulk-creation/upsert of players is disabled to prevent automatic creation
  // of player documents from arbitrary input. Manage players via the admin
  // interface or direct DB operations.
  res.status(403).json({ error: 'creating_players_disabled', message: 'Bulk creating players via this API is disabled.' })
})

// Lấy danh sách loại chi phí
app.get('/api/expense-types', async (req, res) => {
  try {
    const docs = await expenseTypes.find({}).sort({ label: 1 }).toArray()
    res.json(docs.map(({ _id, ...rest }) => rest))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Lấy danh sách combos (T3/T7)
app.get('/api/combos', async (req, res) => {
  try {
    const docs = await combos.find({}).sort({ _id: 1 }).toArray()
    // return normalized: [{ label, emoji, members }]
    res.json(docs.map(({ _id, ...rest }) => rest))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk upsert combos (keyed by label)
app.post('/api/combos/bulk', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : []
    const playerDocs = await players.find({}).toArray()
    const nameToId = new Map(playerDocs.map((p) => [String(p.name || '').trim(), String(p._id)]))
    const idToName = new Map(playerDocs.map((p) => [String(p._id), String(p.name || '').trim()]))

    const normalizeMemberId = (value) => {
      const raw = String(value || '').trim()
      if (!raw) return null
      return nameToId.get(raw) || raw
    }

    const normalized = []
    for (const it of items) {
      if (!it) continue
      const label = String(it.label || '').trim()
      if (!label) continue
      const emoji = String(it.emoji || '').trim()
      let members = Array.isArray(it.members) ? it.members.map(normalizeMemberId).filter(Boolean) : []
      // Sort members alphabetically by name
      members = members.sort((a, b) => {
        const nameA = idToName.get(String(a)) || String(a)
        const nameB = idToName.get(String(b)) || String(b)
        return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' })
      })
      normalized.push({ label, emoji, members })
    }

    if (normalized.length === 0) return res.json({ ok: true, upserted: 0 })

    await combos.bulkWrite(
      normalized.map((c) => ({
        updateOne: {
          filter: { _id: c.label },
          update: { $set: { _id: c.label, label: c.label, emoji: c.emoji, members: c.members } },
          upsert: true,
        },
      }))
    )

    res.json({ ok: true, upserted: normalized.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update a combo by label
app.put('/api/combos/:label', async (req, res) => {
  try {
    const label = req.params.label
    const { emoji, members } = req.body
    const playerDocs = await players.find({}).toArray()
    const nameToId = new Map(playerDocs.map((p) => [String(p.name || '').trim(), String(p._id)]))
    const update = {}
    if (emoji !== undefined) update.emoji = String(emoji)
    if (members !== undefined) {
      update.members = Array.isArray(members)
        ? members.map((m) => {
            const raw = String(m || '').trim()
            return nameToId.get(raw) || raw
          }).filter(Boolean)
        : []
    }

    const result = await combos.updateOne({ _id: label }, { $set: { ...update, label } })
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Combo not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete a combo by label
app.delete('/api/combos/:label', async (req, res) => {
  try {
    const label = req.params.label
    const result = await combos.deleteOne({ _id: label })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Combo not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk upsert danh sách loại chi phí (key chính là value)
app.post('/api/expense-types/bulk', async (req, res) => {
  try {
    const types = [...new Map((req.body || [])
      .map((type) => ({
        value: String(type?.value || '').trim(),
        label: String(type?.label || '').trim(),
        emoji: String(type?.emoji || '🧾').trim() || '🧾',
      }))
      .filter((type) => type.value && type.label)
      .map((type) => [type.value, type]))
      .values()]

    if (types.length === 0) {
      return res.json({ ok: true, upserted: 0 })
    }

    await expenseTypes.bulkWrite(
      types.map((type) => ({
        updateOne: {
          filter: { _id: type.value },
          update: { $setOnInsert: { _id: type.value, ...type } },
          upsert: true,
        },
      }))
    )

    res.json({ ok: true, upserted: types.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Xoá 1 session theo id (id của app, không phải _id MongoDB)
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await sessions.deleteOne({ id: req.params.id })
    res.json({ ok: true })
  } catch (err) {
    
    res.status(500).json({ error: err.message })
  }
})

// Cập nhật 1 session theo id
app.put('/api/sessions/:id', async (req, res) => {
  try {
    const id = req.params.id
    const playerDocs = await players.find({}).toArray()
    const nameToId = new Map(playerDocs.map((p) => [String(p.name || '').trim(), String(p._id)]))

    const resolveId = (value) => {
      if (!value && value !== 0) return ''
      if (typeof value === 'object') {
        const rawId = value.id != null ? String(value.id).trim() : ''
        if (rawId) return rawId
        const rawName = String(value.name || '').trim()
        return nameToId.get(rawName) || rawName
      }
      const raw = String(value).trim()
      return nameToId.get(raw) || raw
    }

    const doc = {
      ...req.body,
      id,
      entries: (req.body.entries || []).map((entry) => ({
        ...entry,
        payer: resolveId(entry.payer),
        people: Array.isArray(entry.people) ? entry.people.map(resolveId).filter(Boolean) : [],
      })),
    }
    const result = await sessions.updateOne(
      { id },
      { $set: doc },
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Session không tồn tại' })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk insert (dùng khi import JSON)
app.post('/api/sessions/bulk', async (req, res) => {
  // Bulk import/upsert of sessions is disabled to avoid automatic creation of
  // session documents. Use controlled import tools or manage sessions in DB.
  res.status(403).json({ error: 'bulk_sessions_disabled', message: 'Bulk creating sessions via this API is disabled.' })
})

// Cập nhật tên người chơi
// Update player by id
app.put('/api/players/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { name: newName } = req.body
    const hasAvatarSource = Object.prototype.hasOwnProperty.call(req.body || {}, 'avatarSource') || Object.prototype.hasOwnProperty.call(req.body || {}, 'avatar')
    const avatarPayload = hasAvatarSource ? String(req.body?.avatarSource ?? req.body?.avatar ?? '').trim() : null

    if (!newName || typeof newName !== 'string') {
      return res.status(400).json({ error: 'Tên mới không hợp lệ' })
    }

    const newNameTrimmed = newName.trim()
    if (!newNameTrimmed) {
      return res.status(400).json({ error: 'Tên không được để trống' })
    }

    const update = { name: newNameTrimmed }
    if (hasAvatarSource) {
      update.avatarSource = avatarPayload || ''
    }

    const result = await players.updateOne(
      { _id: id },
      { $set: update }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Người chơi không tồn tại' })
    }

    const updated = await players.findOne({ _id: id })
    res.json({
      ok: true,
      player: updated ? {
        id: updated._id,
        name: updated.name || newNameTrimmed,
        avatarSource: updated.avatarSource || '',
      } : { id, name: newNameTrimmed, avatarSource: update.avatarSource || '' },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Xoá một người chơi
app.delete('/api/players/:id', async (req, res) => {
  try {
    const id = req.params.id
    // Prevent deletion if player is referenced in any session (as payer or in people)
    const inUse = await sessions.findOne({
      $or: [
        { 'entries.payer': id },
        { 'entries.payer.id': id },
        { 'entries.people': id },
        { 'entries.people.id': id },
      ],
    })

    if (inUse) {
      return res.status(409).json({ error: 'player_in_sessions', message: 'Không thể xóa: người chơi đã tham gia session' })
    }

    const result = await players.deleteOne({ _id: id })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Người chơi không tồn tại' })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Cập nhật một loại chi phí
app.put('/api/expense-types/:value', async (req, res) => {
  try {
    const value = req.params.value
    const updated = req.body

    if (!updated.label || typeof updated.label !== 'string') {
      return res.status(400).json({ error: 'Label không hợp lệ' })
    }

    const result = await expenseTypes.updateOne(
      { _id: value },
      { $set: { ...updated, _id: value } }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Loại chi phí không tồn tại' })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Xoá một loại chi phí
app.delete('/api/expense-types/:value', async (req, res) => {
  try {
    const value = req.params.value
    const result = await expenseTypes.deleteOne({ _id: value })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Loại chi phí không tồn tại' })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Serve React build (production) ──────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))
app.get('/{*path}', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`))
