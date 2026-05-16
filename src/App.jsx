import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import SessionForm from './components/SessionForm'
import Sidebar from './components/Sidebar'
import * as mongoApi from './services/mongoApi'
import { DEFAULT_EXPENSE_TYPES, getSessionPeople, sortExpenseTypes, sortPlayerNames, loadCombos } from './constants'
// Page imports
import SessionsPage from './pages/SessionsPage'
import MatchHistoryPage from './pages/MatchHistoryPage'
import SessionDetailPage from './pages/SessionDetailPage'
import PlayersPage from './pages/PlayersPage'
import ExpenseTypesPage from './pages/ExpenseTypesPage'
import StatsPage from './pages/StatsPage'
import EmptyPage from './pages/EmptyPage'
import ComboConfigPage from './pages/ComboConfigPage'

const STORAGE_KEY = 'badminton-sessions'

const EXPENSE_EMOJI_CATEGORIES = [
  {
    label: '🍕 Thức ăn & đồ uống',
    emojis: ['🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🍱', '🍘', '🍙', '🍚', '🍜', '🍝', '🍠', '🥟', '🦪', '🍤', '🍣', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🥧', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧊', '🧈', '🥛', '🥗', '🥘', '🍲', '🍖', '🍗', '🌶️', '🧄', '🧅']
  },
  {
    label: '💰 Tiền & thanh toán',
    emojis: ['💰', '💵', '💴', '💶', '💷', '💳', '🏧']
  },
  {
    label: '🏸 Thể thao & giải trí',
    emojis: ['🏸', '🎾', '⚽', '🏀', '🏐', '🏈', '🎱', '🏓', '🏒', '🥊', '🥋', '🎣', '🎽', '🏅', '🏆', '🥇', '🥈', '🥉']
  },
  {
    label: '🎉 Hoạt động & sự kiện',
    emojis: ['🎉', '🎊', '🎈', '🎀', '🎁', '🎂', '🎃', '🎄', '🎆', '🎇', '✨', '⭐', '🌟', '💫', '🎯', '🎪', '🎭', '🎬', '🎤', '🎧', '🎼', '🎹', '🎸', '🎺', '🎷', '🥁', '🎻']
  },
  {
    label: '🏠 Địa điểm & công cộng',
    emojis: ['🏠', '🏡', '🏘️', '🏢', '🏬', '🏭', '🏯', '🏰', '⛪', '🕌', '🕍', '🛕', '🗼', '🗽', '⛩️', '🛤️', '🛣️', '🗿', '⛲', '⛺', '🏖️', '🏝️', '🏜️', '⛰️', '⛳', '⛸️', '🎡', '🎢', '🎠']
  },
  {
    label: '🔧 Công cụ & đối tượng',
    emojis: ['⚒️', '🛠️', '🔧', '🔨', '🏗️', '⚙️', '🔩', '⛓️', '🧱', '💎', '🔫', '💣', '🧨', '🔪', '🔏', '🔐', '🗝️', '🚪', '⌛', '📱', '💻', '⌨️', '🖱️', '🖨️', '📠', '📺', '📻', '📡']
  }
]

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export default function App() {
  const [sessions, setSessions] = useState(loadSessions)
  const [players, setPlayers] = useState([]) // array of { id, name }
  const [expenseTypes, setExpenseTypes] = useState(DEFAULT_EXPENSE_TYPES)
  const [combos, setCombos] = useState(() => loadCombos())
  const [currentSession, setCurrentSession] = useState(null)
  const [viewingSession, setViewingSession] = useState(null)
  const [activeTab, setActiveTab] = useState('history')
  const [sidebarView, setSidebarView] = useState({ view: 'sessions', session: null })
  const [dbStatus, setDbStatus] = useState(mongoApi.isConfigured ? 'loading' : 'offline')
  const importRef = useRef(null)

  // Modal states
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false)
  const [playerInputValue, setPlayerInputValue] = useState('')
  const [isEditPlayerModalOpen, setIsEditPlayerModalOpen] = useState(false)
  const [editPlayerId, setEditPlayerId] = useState('')
  const [editPlayerNewName, setEditPlayerNewName] = useState('')
  
  const [isAddExpenseTypeModalOpen, setIsAddExpenseTypeModalOpen] = useState(false)
  const [expenseTypeLabel, setExpenseTypeLabel] = useState('')
  const [expenseTypeEmoji, setExpenseTypeEmoji] = useState('🧾')
  const [isEditExpenseTypeModalOpen, setIsEditExpenseTypeModalOpen] = useState(false)
  const [editExpenseTypeValue, setEditExpenseTypeValue] = useState('')
  const [editExpenseTypeLabel, setEditExpenseTypeLabel] = useState('')
  const [editExpenseTypeEmoji, setEditExpenseTypeEmoji] = useState('🧾')
  
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false)
  const [newSessionDate, setNewSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [isEditingSessionInModal, setIsEditingSessionInModal] = useState(false)

  const getNameById = useCallback((id) => {
    const p = players.find((pp) => pp.id === id)
    return p ? p.name : id
  }, [players])

  const getIdByName = useCallback((name) => {
    const p = players.find((pp) => pp.name === name)
    return p ? p.id : null
  }, [players])

  const ensurePlayersForNames = useCallback(async (names) => {
    const toCreate = []
    for (const name of names) {
      if (!name) continue
      if (!players.some((p) => p.name === name)) {
        const id = crypto.randomUUID()
        toCreate.push({ id, name })
      }
    }
    if (toCreate.length === 0) return
    setPlayers((prev) => [...prev, ...toCreate])
    if (mongoApi.isConfigured) {
      try {
        await mongoApi.upsertPlayers(toCreate)
        const fresh = await mongoApi.getAllPlayers()
        setPlayers(Array.isArray(fresh) ? fresh : [])
      } catch (e) {
        console.error(e)
      }
    }
  }, [players])

  const extractNamesFromSession = useCallback((session) => {
    // returns array of names (resolve ids to names if needed)
    const raw = getSessionPeople([session])
    return raw.map((r) => {
      // if r matches an id in players, return name
      const found = players.find((p) => p.id === r)
      return found ? found.name : r
    })
  }, [players])

  const handleAddPlayerName = useCallback((name) => {
    ensurePlayersForNames([name])
  }, [ensurePlayersForNames])

  const playerNames = useMemo(() => sortPlayerNames(players.map((p) => p.name)), [players])

  const persistExpenseTypes = useCallback((types) => {
    if (!types.length) return
    const nextTypes = sortExpenseTypes(types)
    setExpenseTypes((prev) => sortExpenseTypes([...prev, ...nextTypes]))
    if (mongoApi.isConfigured) {
      mongoApi.upsertExpenseTypes(nextTypes).catch(console.error)
    }
  }, [])

  const handleAddExpenseType = useCallback((type) => {
    persistExpenseTypes([type])
  }, [persistExpenseTypes])

  // Tải dữ liệu từ MongoDB khi app khởi động
  useEffect(() => {
    if (!mongoApi.isConfigured) return
    setDbStatus('loading')
    Promise.allSettled([mongoApi.getAllSessions(), mongoApi.getAllPlayers(), mongoApi.getAllExpenseTypes(), mongoApi.getAllCombos()])
      .then(async ([sessionsResult, playersResult, typesResult, combosResult]) => {
        const localSessions = loadSessions()
        const docs = sessionsResult.status === 'fulfilled' ? sessionsResult.value : []
        const fetchedPlayersRaw = playersResult.status === 'fulfilled' ? playersResult.value : []
        // players: API returns array of { id, name } or legacy array of strings
        let resolvedPlayers = []
        if (Array.isArray(fetchedPlayersRaw) && fetchedPlayersRaw.length && typeof fetchedPlayersRaw[0] === 'string') {
          // legacy: convert strings to objects with generated ids
          resolvedPlayers = fetchedPlayersRaw.map((n) => ({ id: crypto.randomUUID(), name: n }))
        } else if (Array.isArray(fetchedPlayersRaw)) {
          resolvedPlayers = fetchedPlayersRaw
        }
        setPlayers(resolvedPlayers)
        const types = typesResult.status === 'fulfilled' ? typesResult.value : []
        const resolvedSessions = docs.length > 0 ? docs : localSessions

        if (docs.length === 0 && localSessions.length > 0) {
          mongoApi.importSessions(localSessions).catch(console.error)
        }

        setSessions(resolvedSessions)
        saveSessions(resolvedSessions)

        // If no players in DB but sessions have names, ensure players exist
        const derived = getSessionPeople(resolvedSessions)
        if (resolvedPlayers.length === 0 && derived.length > 0) {
          const toCreate = [...new Set(derived)].map((n) => ({ id: crypto.randomUUID(), name: n }))
          try {
            await mongoApi.upsertPlayers(toCreate)
            setPlayers((prev) => [...prev, ...toCreate])
          } catch (err) {
            console.error(err)
          }
        }

        const resolvedTypes = sortExpenseTypes([...DEFAULT_EXPENSE_TYPES, ...types])
        setExpenseTypes(resolvedTypes)

        // combos from DB (fallback to local storage)
        try {
          const fetchedCombos = combosResult.status === 'fulfilled' ? combosResult.value : null
          if (Array.isArray(fetchedCombos) && fetchedCombos.length) {
            setCombos(fetchedCombos)
          } else {
            setCombos(loadCombos())
          }
        } catch (e) {
          setCombos(loadCombos())
        }

        if (types.length === 0) {
          mongoApi.upsertExpenseTypes(DEFAULT_EXPENSE_TYPES).catch(console.error)
        }

        if (sessionsResult.status === 'rejected' && namesResult.status === 'rejected' && typesResult.status === 'rejected') {
          throw sessionsResult.reason || namesResult.reason
        }

        setDbStatus('ready')
      })
      .catch((err) => {
        console.error('MongoDB load error:', err)
        setDbStatus('error')
      })
  }, [])

  const handleSaveSession = useCallback((session) => {
    const isExisting = sessions.some((item) => item.id === session.id)
    ensurePlayersForNames(extractNamesFromSession(session))
    setSessions((prev) => {
      const next = isExisting
        ? prev.map((item) => (item.id === session.id ? session : item))
        : [session, ...prev]
      saveSessions(next)
      return next
    })
    setCurrentSession(null)
    setIsAddSessionModalOpen(false)
    setViewingSession(session)
    if (mongoApi.isConfigured) {
      if (isExisting) {
        mongoApi.updateSession(session).catch(console.error)
      } else {
        mongoApi.insertSession(session).catch(console.error)
      }
    }
  }, [extractNamesFromSession, ensurePlayersForNames, sessions])

  const handleDeleteSession = useCallback((id) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      saveSessions(next)
      return next
    })
    if (viewingSession?.id === id) {
      setViewingSession(null)
    }
    if (mongoApi.isConfigured) {
      mongoApi.removeSession(id).catch(console.error)
    }
  }, [viewingSession])

  const handleUpdateSession = useCallback((updatedSession) => {
    ensurePlayersForNames(extractNamesFromSession(updatedSession))
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
      saveSessions(next)
      return next
    })

    setViewingSession((prev) => (prev?.id === updatedSession.id ? updatedSession : prev))

    if (mongoApi.isConfigured) {
      mongoApi.updateSession(updatedSession).catch(console.error)
    }
  }, [extractNamesFromSession, ensurePlayersForNames])

  const handleNewSession = useCallback(() => {
    setNewSessionDate(new Date().toISOString().split('T')[0])
    setCurrentSession({ id: crypto.randomUUID(), date: new Date().toISOString().split('T')[0], entries: [] })
    setIsEditingSessionInModal(false)
    setIsAddSessionModalOpen(true)
  }, [])

  const handleCreateSessionFromModal = useCallback(() => {
    setCurrentSession({ id: crypto.randomUUID(), date: newSessionDate, entries: [] })
    setViewingSession(null)
    setIsAddSessionModalOpen(false)
    setNewSessionDate(new Date().toISOString().split('T')[0])
  }, [newSessionDate])

  const handleBack = useCallback(() => {
    setCurrentSession(null)
    setIsAddSessionModalOpen(false)
    if (!isEditingSessionInModal) {
      setViewingSession(null)
      setSidebarView({ view: 'sessions', session: null })
    }
    setIsEditingSessionInModal(false)
  }, [isEditingSessionInModal])

  const handleEditSession = useCallback(async (session) => {
    // Ensure players exist for any legacy names in session, then normalize entries to ids
    await ensurePlayersForNames(extractNamesFromSession(session))
    let freshPlayers = players
    if (mongoApi.isConfigured) {
      try {
        const fetched = await mongoApi.getAllPlayers()
        if (Array.isArray(fetched) && fetched.length) freshPlayers = fetched
      } catch (e) {
        /* ignore */
      }
    }
    const nameToId = Object.fromEntries((freshPlayers || []).map((p) => [p.name, p.id]))
    const normalized = {
      ...session,
      entries: (session.entries || []).map((entry) => ({
        ...entry,
        payer: nameToId[entry.payer] || entry.payer,
        people: (entry.people || []).map((p) => nameToId[p] || p),
      })),
    }
    setCurrentSession(normalized)
    setIsEditingSessionInModal(true)
    setIsAddSessionModalOpen(true)
  }, [ensurePlayersForNames, extractNamesFromSession, players])

  const handleExport = useCallback(() => {
    const data = JSON.stringify(sessions, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `badminton-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [sessions])

  const handleImport = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (!Array.isArray(imported)) return alert('File không hợp lệ')
        const existingIds = new Set(sessions.map((s) => s.id))
        const newOnes = imported.filter((s) => !existingIds.has(s.id))
        ensurePlayersForNames(getSessionPeople(newOnes))
        setSessions((prev) => {
          const merged = [...newOnes, ...prev]
          saveSessions(merged)
          if (mongoApi.isConfigured && newOnes.length) {
            mongoApi.importSessions(newOnes).catch(console.error)
          }
          return merged
        })
        alert(`Đã import ${imported.length} phiên`)
      } catch {
        alert('Không đọc được file JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleEditPlayer = useCallback((player, newName) => {
    // player: object { id, name } passed from PlayersPage
    const id = player.id
    const newNameTrim = String(newName || '').trim()
    if (!newNameTrim || newNameTrim === player.name) return
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: newNameTrim } : p)))

    // No need to update sessions (they reference ids). Only persist player name change.
    if (mongoApi.isConfigured) {
      mongoApi.updatePlayer(id, newNameTrim).catch(console.error)
    }
  }, [])

  const handleDeletePlayer = useCallback(async (player) => {
    // Prevent deletion if player appears in any existing sessions (local check)
    const inUseLocal = sessions.some((s) => (s.entries || []).some((e) => {
      // payer may be id or name or object
      const payerMatch = e.payer === player.id || e.payer === player.name || (e.payer && e.payer.id === player.id) || (e.payer && e.payer.name === player.name)
      // people may be array of ids, names, or objects
      const people = e.people || []
      const peopleMatch = people.includes && (people.includes(player.id) || people.includes(player.name)) || people.some && people.some((p) => (p && (p.id === player.id || p.name === player.name)))
      return payerMatch || peopleMatch
    }))
    if (inUseLocal) return alert('Không thể xóa: người chơi đã tham gia session')

    // Only remove locally after backend confirms deletion. If no backend, allow local delete.
    if (!mongoApi.isConfigured) {
      setPlayers((prev) => prev.filter((p) => p.id !== player.id))
      return
    }

    try {
      await mongoApi.removePlayer(player.id)
      setPlayers((prev) => prev.filter((p) => p.id !== player.id))
    } catch (err) {
      console.error('Delete player error:', err)
      const msg = String(err.message || '')
      if (msg.includes('player_in_sessions') || msg.includes('409')) {
        alert('Không thể xóa: người chơi đã tham gia session')
      } else if (msg.includes('404')) {
        alert('Người chơi không tồn tại')
      } else {
        alert('Lỗi khi xóa người chơi: ' + (err.message || err))
      }
    }
  }, [])

  const handleEditExpenseType = useCallback((value, updated) => {
    setExpenseTypes((prev) => prev.map((t) => (t.value === value ? updated : t)))
    if (mongoApi.isConfigured) {
      mongoApi.updateExpenseType(value, updated).catch(console.error)
    }
  }, [])

  const handleDeleteExpenseType = useCallback((value) => {
    // only delete if no session uses this type
    const inUse = sessions.some((s) => (s.entries || []).some((e) => e.type === value))
    if (inUse) return alert('Không thể xóa: loại này đang được sử dụng trong phiên')
    setExpenseTypes((prev) => prev.filter((t) => t.value !== value))
    if (mongoApi.isConfigured) {
      mongoApi.removeExpenseType(value).catch(console.error)
    }
  }, [sessions])

  const handleCreatePlayer = useCallback(() => {
    const name = playerInputValue.trim()
    if (!name) return
    handleAddPlayerName(name)
    setPlayerInputValue('')
    setIsAddPlayerModalOpen(false)
  }, [playerInputValue, handleAddPlayerName])

  const handleCreateExpenseType = useCallback(() => {
    const label = expenseTypeLabel.trim()
    if (!label) return
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    handleAddExpenseType({ value, label, emoji: expenseTypeEmoji })
    setExpenseTypeLabel('')
    setExpenseTypeEmoji('🧾')
    setIsAddExpenseTypeModalOpen(false)
  }, [expenseTypeLabel, expenseTypeEmoji, handleAddExpenseType])

  const handleUpdatePlayerFromModal = useCallback(() => {
    const newName = editPlayerNewName.trim()
    if (!newName) return
    // find player by id
    const player = players.find((p) => p.id === editPlayerId)
    if (!player || player.name === newName) return
    handleEditPlayer(player, newName)
    setIsEditPlayerModalOpen(false)
    setEditPlayerId('')
    setEditPlayerNewName('')
  }, [editPlayerId, editPlayerNewName, handleEditPlayer, players])

  const handleUpdateExpenseTypeFromModal = useCallback(() => {
    const label = editExpenseTypeLabel.trim()
    if (!label) return
    handleEditExpenseType(editExpenseTypeValue, { value: editExpenseTypeValue, label, emoji: editExpenseTypeEmoji })
    setIsEditExpenseTypeModalOpen(false)
    setEditExpenseTypeValue('')
    setEditExpenseTypeLabel('')
    setEditExpenseTypeEmoji('🧾')
  }, [editExpenseTypeValue, editExpenseTypeLabel, editExpenseTypeEmoji, handleEditExpenseType])

  const playerStats = useMemo(() => {
    const playerNames = sortPlayerNames(players.map((p) => p.name))
    const stats = {}
    for (const name of playerNames) {
      stats[name] = { total: 0, avgPerMonth: 0 }
    }

    if (!sessions || sessions.length === 0) return stats

    // compute date span in months (inclusive)
    const dates = sessions.map((s) => new Date(s.date))
    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))
    const monthsSpan = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1

    for (const session of sessions) {
      const participants = new Set()
      ;(session.entries || []).forEach((entry) => {
        if (entry.payer) participants.add(getNameById(entry.payer) || entry.payer)
        ;(entry.people || []).forEach((p) => participants.add(getNameById(p) || p))
      })

      for (const name of Object.keys(stats)) {
        if (participants.has(name)) stats[name].total += 1
      }
    }

    for (const name of Object.keys(stats)) {
      const total = stats[name].total || 0
      stats[name].avgPerMonth = monthsSpan > 0 ? Number((total / monthsSpan).toFixed(1)) : 0
    }

    return stats
  }, [sessions, playerNames])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <img src="./src/files/icon.png" alt="Badminton" className="header-icon" />
          <div className="header-info">
            <h1> Tính tiền cầu lông</h1>
            <p>Chia tiền sân, cầu, trà đá, cơm</p>
          </div>
          <a href="https://github.com/nxquan/badminton-calculator" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
            🐙 Contribution
          </a>
        </div>
        {dbStatus === 'error' && <span className="db-badge db-error" style={{ marginTop: 8 }}>🔴 Lỗi kết nối DB</span>}
      </header>

      <div className="app-layout" style={{ display: 'flex', gap: 16 }}>
        <Sidebar
          onSelectMenu={(view) => setSidebarView({ view, session: null })}
        />

          <div className="app-content" style={{ flex: 1 }}>
            {/* Page routing based on sidebar selection */}
            {sidebarView.view === 'sessions' && (
              <SessionsPage
                sessions={sessions}
                expenseTypes={expenseTypes}
                onViewSession={(s) => { setViewingSession(s); setSidebarView({ view: 'session', session: s }) }}
                onDeleteSession={handleDeleteSession}
                onNewSession={handleNewSession}
                onSyncPlayers={() => ensurePlayersForNames(getSessionPeople(sessions))}
              />
            )}
            {sidebarView.view === 'match-history' && (
              <MatchHistoryPage
                sessions={sessions}
                onViewSession={(s) => { setViewingSession(s); setSidebarView({ view: 'session', session: s }) }}
              />
            )}
            {sidebarView.view === 'session' && viewingSession && (
              <SessionDetailPage
                session={viewingSession}
                expenseTypes={expenseTypes}
                players={players}
                onBack={() => { setViewingSession(null); setSidebarView({ view: 'sessions', session: null }) }}
                onUpdateSession={handleUpdateSession}
                onEditSession={handleEditSession}
              />
            )}
            {sidebarView.view === 'players' && (
              <PlayersPage
                  players={players}
                  playerStats={playerStats}
                onAddClick={() => {
                  setPlayerInputValue('')
                  setIsAddPlayerModalOpen(true)
                }}
                onEditClick={(p) => {
                  setEditPlayerId(p.id)
                  setEditPlayerNewName(p.name)
                  setIsEditPlayerModalOpen(true)
                }}
                onDeleteClick={handleDeletePlayer}
              />
            )}
            {sidebarView.view === 'combo-T3' && (
              <ComboConfigPage
                label="T3"
                combos={combos}
                players={players}
                onSave={async (updatedCombo) => {
                  try {
                    // replace or append in local combos list
                    const next = (() => {
                      const found = combos.find((c) => c.label === updatedCombo.label)
                      if (found) return combos.map((c) => (c.label === updatedCombo.label ? updatedCombo : c))
                      return [...combos, updatedCombo]
                    })()
                    setCombos(next)
                    if (mongoApi.isConfigured) {
                      await mongoApi.upsertCombos(next)
                    } else {
                      // fallback to localStorage
                      const { saveCombos } = await import('./constants')
                      saveCombos(next)
                    }
                  } catch (e) {
                    console.error(e)
                    alert('Lỗi khi lưu combo')
                  }
                }}
              />
            )}
            {sidebarView.view === 'combo-T7' && (
              <ComboConfigPage
                label="T7"
                combos={combos}
                players={players}
                onSave={async (updatedCombo) => {
                  try {
                    const next = (() => {
                      const found = combos.find((c) => c.label === updatedCombo.label)
                      if (found) return combos.map((c) => (c.label === updatedCombo.label ? updatedCombo : c))
                      return [...combos, updatedCombo]
                    })()
                    setCombos(next)
                    if (mongoApi.isConfigured) {
                      await mongoApi.upsertCombos(next)
                    } else {
                      const { saveCombos } = await import('./constants')
                      saveCombos(next)
                    }
                  } catch (e) {
                    console.error(e)
                    alert('Lỗi khi lưu combo')
                  }
                }}
              />
            )}
            {sidebarView.view === 'types' && (
              <ExpenseTypesPage
                expenseTypes={expenseTypes}
                onAddClick={() => {
                  setExpenseTypeLabel('')
                  setExpenseTypeEmoji('🧾')
                  setIsAddExpenseTypeModalOpen(true)
                }}
                onEditClick={(t) => {
                  setEditExpenseTypeValue(t.value)
                  setEditExpenseTypeLabel(t.label)
                  setEditExpenseTypeEmoji(t.emoji)
                  setIsEditExpenseTypeModalOpen(true)
                }}
                onDeleteClick={handleDeleteExpenseType}
              />
            )}
            {sidebarView.view === 'stats' && (
              <StatsPage
                sessions={sessions}
                expenseTypes={expenseTypes}
                players={players}
              />
            )}
            {!['sessions', 'match-history', 'session', 'players', 'types', 'stats', 'combo-T3', 'combo-T7'].includes(sidebarView.view) && (
              <EmptyPage />
            )}
          </div>
        </div>

      {/* Modal thêm người chơi */}
      {isAddPlayerModalOpen && (
        <div className="modal-backdrop" style={{ pointerEvents: 'auto' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Thêm người chơi</h2>
              <button className="modal-close" onClick={() => setIsAddPlayerModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên người chơi</label>
                <input
                  type="text"
                  placeholder="Nhập tên người chơi..."
                  value={playerInputValue}
                  onChange={(e) => setPlayerInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreatePlayer()
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsAddPlayerModalOpen(false)}>Đóng</button>
              <button className="btn btn-primary" onClick={handleCreatePlayer}>Tạo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm loại kinh phí */}
      {isAddExpenseTypeModalOpen && (
        <div className="modal-backdrop" style={{ pointerEvents: 'auto' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Thêm loại kinh phí</h2>
              <button className="modal-close" onClick={() => setIsAddExpenseTypeModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên loại</label>
                <input
                  type="text"
                  placeholder="Nhập tên loại kinh phí..."
                  value={expenseTypeLabel}
                  onChange={(e) => setExpenseTypeLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateExpenseType()
                  }}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Chọn Icon</label>
                <div className="emoji-categories">
                  {EXPENSE_EMOJI_CATEGORIES.map((category) => (
                    <div key={category.label} className="emoji-category">
                      <div className="emoji-category-label">{category.label}</div>
                      <div className="emoji-picker">
                        {category.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className={`emoji-btn ${expenseTypeEmoji === emoji ? 'selected' : ''}`}
                            onClick={() => setExpenseTypeEmoji(emoji)}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsAddExpenseTypeModalOpen(false)}>Đóng</button>
              <button className="btn btn-primary" onClick={handleCreateExpenseType}>Tạo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa người chơi */}
      {isEditPlayerModalOpen && (
        <div className="modal-backdrop" style={{ pointerEvents: 'auto' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Chỉnh sửa người chơi</h2>
              <button className="modal-close" onClick={() => setIsEditPlayerModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên người chơi</label>
                <input
                  type="text"
                  placeholder="Nhập tên người chơi..."
                  value={editPlayerNewName}
                  onChange={(e) => setEditPlayerNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdatePlayerFromModal()
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsEditPlayerModalOpen(false)}>Đóng</button>
              <button className="btn btn-primary" onClick={handleUpdatePlayerFromModal}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chỉnh sửa loại kinh phí */}
      {isEditExpenseTypeModalOpen && (
        <div className="modal-backdrop" style={{ pointerEvents: 'auto' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Chỉnh sửa loại kinh phí</h2>
              <button className="modal-close" onClick={() => setIsEditExpenseTypeModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Tên loại</label>
                <input
                  type="text"
                  placeholder="Nhập tên loại kinh phí..."
                  value={editExpenseTypeLabel}
                  onChange={(e) => setEditExpenseTypeLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateExpenseTypeFromModal()
                  }}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Chọn Icon</label>
                <div className="emoji-categories">
                  {EXPENSE_EMOJI_CATEGORIES.map((category) => (
                    <div key={category.label} className="emoji-category">
                      <div className="emoji-category-label">{category.label}</div>
                      <div className="emoji-picker">
                        {category.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className={`emoji-btn ${editExpenseTypeEmoji === emoji ? 'selected' : ''}`}
                            onClick={() => setEditExpenseTypeEmoji(emoji)}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setIsEditExpenseTypeModalOpen(false)}>Đóng</button>
              <button className="btn btn-primary" onClick={handleUpdateExpenseTypeFromModal}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal SessionForm - Phiên đánh mới / Chỉnh sửa */}
      {isAddSessionModalOpen && currentSession && (
        <div className="modal-backdrop" style={{ pointerEvents: 'auto' }}>
          <div className="modal-content" style={{ maxWidth: '1080px', maxHeight: '90vh', padding: 16 }}>
            <div className="modal-header">
              <h2>{isEditingSessionInModal ? 'Chỉnh sửa phiên' : 'Phiên đánh mới'}</h2>
              <button className="modal-close" onClick={handleBack}>✕</button>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              <SessionForm
                session={currentSession}
                players={players}
                expenseTypes={expenseTypes}
                combos={combos}
                onAddPlayerName={handleAddPlayerName}
                onAddExpenseType={handleAddExpenseType}
                onSave={handleSaveSession}
                onCancel={handleBack}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
