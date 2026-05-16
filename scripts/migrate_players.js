import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { randomUUID } from 'crypto'

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('Please set MONGODB_URI')
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db('badminton')
  const sessions = db.collection('sessions')
  const players = db.collection('players')

  console.log('Connected, scanning sessions...')

  const allSessions = await sessions.find({}).toArray()

  // Gather all unique names from sessions (payer + people)
  const names = new Set()
  for (const s of allSessions) {
    for (const entry of (s.entries || [])) {
      if (entry.payer && typeof entry.payer === 'string') names.add(entry.payer)
      for (const p of (entry.people || [])) {
        if (p && typeof p === 'string') names.add(p)
      }
    }
  }

  console.log(`Found ${names.size} unique names in sessions`)

  // Build existing name->id map from players collection
  const nameToId = new Map()
  const oldIdToNewId = new Map()
  const legacyIdsToRemove = []
  const existingPlayers = await players.find({}).toArray()

  const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)

  for (const doc of existingPlayers) {
    if (doc.name && typeof doc.name === 'string') {
      // If the document's _id is already a UUID string, keep it.
      // Otherwise create a new UUID document and mark the old _id for removal.
      if (isUuid(doc._id)) {
        nameToId.set(doc.name, doc._id)
      } else {
        const oldId = doc._id
        const newId = randomUUID()
        await players.insertOne({ _id: newId, name: doc.name })
        nameToId.set(doc.name, newId)
        oldIdToNewId.set(String(oldId), newId)
        legacyIdsToRemove.push(oldId)
      }
    } else {
      // legacy doc where _id was the name
      const name = String(doc._id)
      const newId = randomUUID()
      await players.insertOne({ _id: newId, name })
      nameToId.set(name, newId)
      legacyIdsToRemove.push(doc._id)
    }
  }

  // For any names not present, create player docs
  for (const name of names) {
    if (!nameToId.has(name)) {
      const id = randomUUID()
      await players.insertOne({ _id: id, name })
      nameToId.set(name, id)
    }
  }

  console.log('Players ensured, updating sessions to use ids...')

  // Update sessions
  for (const s of allSessions) {
    let changed = false
    const newEntries = (s.entries || []).map((entry) => {
      const newEntry = { ...entry }
      // Normalize payer: could be a name string, an old id string, or an ObjectId; compare as string.
      if (newEntry.payer != null) {
        const payerKey = String(newEntry.payer)
        if (nameToId.has(newEntry.payer)) {
          const id = nameToId.get(newEntry.payer)
          newEntry.payer = id
          changed = true
        } else if (oldIdToNewId.has(payerKey)) {
          newEntry.payer = oldIdToNewId.get(payerKey)
          changed = true
        }
      }

      if (Array.isArray(newEntry.people)) {
        newEntry.people = newEntry.people.map((p) => {
          const key = String(p)
          if (nameToId.has(p)) return nameToId.get(p)
          if (oldIdToNewId.has(key)) return oldIdToNewId.get(key)
          return p
        })
        if (newEntry.people.some((p, i) => p !== (entry.people || [])[i])) changed = true
      }
      return newEntry
    })

    if (changed) {
      await sessions.updateOne({ id: s.id }, { $set: { entries: newEntries } })
      console.log(`Updated session ${s.id}`)
    }
  }

  // Remove legacy player docs that used name as _id
  if (legacyIdsToRemove.length) {
    await players.deleteMany({ _id: { $in: legacyIdsToRemove } })
    console.log(`Removed ${legacyIdsToRemove.length} legacy player docs`) 
  }

  // Ensure each player doc contains an explicit `id` field mirroring `_id` for UI/debug convenience
  console.log('Ensuring explicit `id` field on player documents...')
  const allPlayerDocs = await players.find({}).toArray()
  for (const doc of allPlayerDocs) {
    const idValue = doc._id
    // only set if missing or different
    if (doc.id !== idValue) {
      await players.updateOne({ _id: doc._id }, { $set: { id: idValue } })
    }
  }
  console.log('Player docs updated with `id` field')

  console.log('Migration complete')
  await client.close()
}

run().catch((err) => { console.error(err); process.exit(1) })
