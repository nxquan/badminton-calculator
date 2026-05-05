import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import path from 'path'
import { fileURLToPath } from 'url'

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
console.log('✅ Kết nối MongoDB thành công')

// ── API routes ──────────────────────────────────────────────

// Lấy tất cả sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const docs = await sessions.find({}).sort({ createdAt: -1 }).toArray()
    // Loại bỏ _id của MongoDB
    res.json(docs.map(({ _id, ...rest }) => rest))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Thêm 1 session
app.post('/api/sessions', async (req, res) => {
  try {
    const doc = { ...req.body, createdAt: req.body.createdAt || new Date().toISOString() }
    await sessions.insertOne(doc)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Lấy danh sách tên người chơi
app.get('/api/players', async (req, res) => {
  try {
    const docs = await players.find({}).sort({ _id: 1 }).toArray()
    res.json(docs.map((doc) => doc._id))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk upsert danh sách tên người chơi (key chính là tên)
app.post('/api/players/bulk', async (req, res) => {
  try {
    const names = [...new Set((req.body || []).map((name) => String(name || '').trim()).filter(Boolean))]
    if (names.length === 0) {
      return res.json({ ok: true, inserted: 0 })
    }

    await players.bulkWrite(
      names.map((name) => ({
        updateOne: {
          filter: { _id: name },
          update: { $setOnInsert: { _id: name, name } },
          upsert: true,
        },
      }))
    )

    res.json({ ok: true, upserted: names.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
    const doc = { ...req.body, id }
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
  try {
    const docs = req.body.map((s) => ({
      ...s,
      createdAt: s.createdAt || new Date().toISOString(),
    }))
    if (docs.length) await sessions.insertMany(docs)
    res.json({ ok: true, inserted: docs.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Serve React build (production) ──────────────────────────
app.use(express.static(path.join(__dirname, 'dist')))
app.get('/{*path}', (_, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`))
