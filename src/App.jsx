import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import SessionForm from './components/SessionForm'
import Sidebar from './components/Sidebar'
import * as mongoApi from './services/mongoApi'
import { DEFAULT_EXPENSE_TYPES, getSessionPeople, sortExpenseTypes, sortPlayerNames, loadCombos } from './constants'
import 'react-toastify/dist/ReactToastify.css'
// Page imports
import SessionsPage from './pages/SessionsPage'
import MatchHistoryPage from './pages/MatchHistoryPage'
import SessionDetailPage from './pages/SessionDetailPage'
import PlayersPage from './pages/PlayersPage'
import ExpenseTypesPage from './pages/ExpenseTypesPage'
import StatsPage from './pages/StatsPage'
import EmptyPage from './pages/EmptyPage'
import ComboConfigPage from './pages/ComboConfigPage'

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

export default function App() {
  const [sessions, setSessions] = useState([])
  const [players, setPlayers] = useState([]) // array of { id, name }
  const [expenseTypes, setExpenseTypes] = useState(DEFAULT_EXPENSE_TYPES)
  const [combos, setCombos] = useState(() => loadCombos())
  const [currentSession, setCurrentSession] = useState(null)
  const [viewingSession, setViewingSession] = useState(null)
  const [activeTab, setActiveTab] = useState('history')
  const [sidebarView, setSidebarView] = useState({ view: 'sessions', session: null })
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [dbStatus, setDbStatus] = useState(mongoApi.isConfigured ? 'loading' : 'offline')
  const importRef = useRef(null)

  // Modal states
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false)
  const [playerInputValue, setPlayerInputValue] = useState('')
  const [playerAvatarSource, setPlayerAvatarSource] = useState('')
  const [isEditPlayerModalOpen, setIsEditPlayerModalOpen] = useState(false)
  const [editPlayerId, setEditPlayerId] = useState('')
  const [editPlayerNewName, setEditPlayerNewName] = useState('')
  const [editPlayerAvatarSource, setEditPlayerAvatarSource] = useState('')
  
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
  const dbInitializedRef = useRef(false)

  const getErrorMessage = useCallback((err, fallback) => {
    const message = String(err?.message || err?.error || err || '').trim()
    return message || fallback
  }, [])

  const verifyImage = useCallback((url, timeout = 5000) => {
    return new Promise((resolve) => {
      if (!url) return resolve(false)
      let settled = false
      const img = new Image()
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          try { img.src = '' } catch {}
          resolve(false)
        }
      }, timeout)
      img.onload = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(true)
        }
      }
      img.onerror = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(false)
        }
      }
      try {
        img.src = url
      } catch (e) {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve(false)
        }
      }
    })
  }, [])

  const runToastMutation = useCallback((promise, messages) => {
    if (!mongoApi.isConfigured) return promise
    return toast.promise(promise, {
      pending: messages.pending,
      success: messages.success,
      error: {
        render({ data }) {
          if (typeof messages.error === 'function') return messages.error(data)
          if (messages.error) return messages.error
          const raw = data?.message || data?.error || data
          return raw ? String(raw) : 'Có lỗi xảy ra'
        },
      },
    })
  }, [])

  const getNameById = useCallback((id) => {
    const p = players.find((pp) => pp.id === id)
    return p ? p.name : id
  }, [players])

  const getIdByName = useCallback((name) => {
    const p = players.find((pp) => pp.name === name)
    return p ? p.id : null
  }, [players])

  const normalizeSessionForStorage = useCallback((session, sourcePlayers) => {
    const resolveId = (value) => {
      if (!value && value !== 0) return ''
      if (typeof value === 'object') {
        const rawId = value.id != null ? String(value.id).trim() : ''
        if (rawId) return rawId
        const rawName = String(value.name || '').trim()
        if (!rawName) return ''
        const byName = (sourcePlayers || []).find((p) => String(p.name || '').trim() === rawName)
        return byName ? String(byName.id) : rawName
      }
      const raw = String(value).trim()
      if (!raw) return ''
      const byId = (sourcePlayers || []).find((p) => String(p.id) === raw)
      if (byId) return String(byId.id)
      const byName = (sourcePlayers || []).find((p) => String(p.name || '').trim() === raw)
      return byName ? String(byName.id) : raw
    }

    return {
      ...session,
      entries: (session.entries || []).map((entry) => ({
        ...entry,
        payer: resolveId(entry.payer),
      })),
    }
  }, [])

  const syncPlayersForNames = useCallback((names) => {
    const toAdd = []
    for (const name of names) {
      if (!name) continue
      if (!players.some((p) => p.name === name)) {
        toAdd.push({ id: crypto.randomUUID(), name, avatarSource: '' })
      }
    }
    if (toAdd.length === 0) return []
    setPlayers((prev) => [...prev, ...toAdd])
    return toAdd
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

  const handleAddPlayerName = useCallback(async (name) => {
    const trimmed = String(name || '').trim()
    if (!trimmed) return null

    const existing = players.find((player) => player.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing.id

    const player = { id: crypto.randomUUID(), name: trimmed, avatarSource: '' }

    if (mongoApi.isConfigured) {
      try {
        await runToastMutation(
          mongoApi.createPlayer(player),
          {
            pending: 'Đang tạo người chơi...',
            success: 'Đã tạo người chơi',
            error: 'Không thể tạo người chơi',
          }
        )
        setPlayers((prev) => (prev.some((item) => item.id === player.id || item.name.trim().toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, player]))
        return player.id
      } catch (error) {
        console.error(error)
        return null
      }
    }

    setPlayers((prev) => (prev.some((item) => item.id === player.id || item.name.trim().toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, player]))
    return player.id
  }, [players, runToastMutation])

  const handleCreatePlayer = useCallback(async () => {
    const name = playerInputValue.trim()
    if (!name) return

    if (players.some((player) => player.name === name)) {
      setPlayerInputValue('')
      setIsAddPlayerModalOpen(false)
      return
    }

    const avatarTrim = String(playerAvatarSource || '').trim()
    if (avatarTrim) {
      const ok = await verifyImage(avatarTrim)
      if (!ok) {
        toast.error('Link avatar không hợp lệ hoặc không truy cập được')
        return
      }
    }

    const id = crypto.randomUUID()
    const player = { id, name, avatarSource: avatarTrim }
    setPlayerInputValue('')
    setPlayerAvatarSource('')
    setIsAddPlayerModalOpen(false)

    if (mongoApi.isConfigured) {
      try {
        await runToastMutation(
          mongoApi.createPlayer(player),
          {
            pending: 'Đang tạo người chơi...',
            success: 'Đã tạo người chơi',
            error: 'Không thể tạo người chơi',
          }
        )
        const fresh = await mongoApi.getAllPlayers()
        setPlayers(Array.isArray(fresh) ? fresh : [])
      } catch (e) {
        console.error(e)
      }
    } else {
      setPlayers((prev) => [...prev, player])
    }
  }, [playerAvatarSource, playerInputValue, players, runToastMutation])

  const playerNames = useMemo(() => sortPlayerNames(players.map((p) => p.name)), [players])

  const persistExpenseTypes = useCallback((types) => {
    if (!types.length) return
    const nextTypes = sortExpenseTypes(types)
    setExpenseTypes((prev) => sortExpenseTypes([...prev, ...nextTypes]))
    if (mongoApi.isConfigured) {
      void runToastMutation(
        mongoApi.upsertExpenseTypes(nextTypes),
        {
          pending: 'Đang lưu loại kinh phí...',
          success: 'Đã lưu loại kinh phí',
          error: 'Không thể lưu loại kinh phí',
        }
      )
    }
  }, [runToastMutation])

  const handleAddExpenseType = useCallback((type) => {
    persistExpenseTypes([type])
  }, [persistExpenseTypes])

  // Tải dữ liệu từ MongoDB khi app khởi động
  useEffect(() => {
    if (!mongoApi.isConfigured || dbInitializedRef.current) return
    dbInitializedRef.current = true
    setDbStatus('loading')
    Promise.allSettled([mongoApi.getAllSessions(), mongoApi.getAllPlayers(), mongoApi.getAllExpenseTypes(), mongoApi.getAllCombos()])
      .then(async ([sessionsResult, playersResult, typesResult, combosResult]) => {
        if (sessionsResult.status === 'rejected') toast.error(getErrorMessage(sessionsResult.reason, 'Không thể tải danh sách phiên'))
        if (playersResult.status === 'rejected') toast.error(getErrorMessage(playersResult.reason, 'Không thể tải danh sách người chơi'))
        if (typesResult.status === 'rejected') toast.error(getErrorMessage(typesResult.reason, 'Không thể tải danh sách loại kinh phí'))
        if (combosResult.status === 'rejected') toast.error(getErrorMessage(combosResult.reason, 'Không thể tải danh sách combo'))

        const docs = sessionsResult.status === 'fulfilled' ? sessionsResult.value : []
        const fetchedPlayersRaw = playersResult.status === 'fulfilled' ? playersResult.value : []
        // players: API returns array of { id, name } or legacy array of strings
        let resolvedPlayers = []
        if (Array.isArray(fetchedPlayersRaw) && fetchedPlayersRaw.length && typeof fetchedPlayersRaw[0] === 'string') {
          // legacy: convert strings to objects with generated ids
          resolvedPlayers = fetchedPlayersRaw.map((n) => ({ id: crypto.randomUUID(), name: n, avatarSource: '' }))
        } else if (Array.isArray(fetchedPlayersRaw)) {
          resolvedPlayers = fetchedPlayersRaw
        }
        setPlayers(resolvedPlayers)
        const types = typesResult.status === 'fulfilled' ? typesResult.value : []
        const resolvedSessions = (docs || []).map((s) => normalizeSessionForStorage(s, resolvedPlayers))

        setSessions(resolvedSessions)

        // If no players in DB but sessions have names, ensure players exist
        const derived = getSessionPeople(resolvedSessions)
        if (resolvedPlayers.length === 0 && derived.length > 0) {
          const toCreate = [...new Set(derived)].map((n) => {
            const id = crypto.randomUUID()
            return { id, name: n, avatarSource: '' }
          })
          setPlayers(toCreate)
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
          void runToastMutation(
            mongoApi.upsertExpenseTypes(DEFAULT_EXPENSE_TYPES),
            {
              pending: 'Đang đồng bộ loại kinh phí...',
              success: 'Đã đồng bộ loại kinh phí mặc định',
              error: 'Không thể đồng bộ loại kinh phí',
            }
          )
        }

        if (sessionsResult.status === 'rejected' && playersResult.status === 'rejected' && typesResult.status === 'rejected') {
          throw sessionsResult.reason || playersResult.reason
        }

        setDbStatus('ready')
      })
      .catch((err) => {
        console.error('MongoDB load error:', err)
        toast.error(getErrorMessage(err, 'Không thể tải dữ liệu từ server'))
        setDbStatus('error')
      })
  }, [getErrorMessage, normalizeSessionForStorage])

  const handleSaveSession = useCallback((session) => {
    const normalizedSession = normalizeSessionForStorage(session, players)
    const isExisting = sessions.some((item) => item.id === normalizedSession.id)
    syncPlayersForNames(extractNamesFromSession(normalizedSession))
    setSessions((prev) => {
      const next = isExisting
        ? prev.map((item) => (item.id === normalizedSession.id ? normalizedSession : item))
        : [normalizedSession, ...prev]
      return next
    })
    setCurrentSession(null)
    setIsAddSessionModalOpen(false)
    setViewingSession(normalizedSession)
    if (mongoApi.isConfigured) {
      void runToastMutation(
        isExisting ? mongoApi.updateSession(normalizedSession) : mongoApi.insertSession(normalizedSession),
        {
          pending: isExisting ? 'Đang cập nhật phiên...' : 'Đang tạo phiên...',
          success: isExisting ? 'Đã cập nhật phiên' : 'Đã tạo phiên',
          error: isExisting ? 'Không thể cập nhật phiên' : 'Không thể tạo phiên',
        }
      )
    }
  }, [extractNamesFromSession, normalizeSessionForStorage, sessions, players, runToastMutation, syncPlayersForNames])

  const handleDeleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (viewingSession?.id === id) {
      setViewingSession(null)
    }
    if (mongoApi.isConfigured) {
      void runToastMutation(
        mongoApi.removeSession(id),
        {
          pending: 'Đang xóa phiên...',
          success: 'Đã xóa phiên',
          error: 'Không thể xóa phiên',
        }
      )
    }
  }, [viewingSession, runToastMutation])

  const handleUpdateSession = useCallback((updatedSession) => {
    const normalizedSession = normalizeSessionForStorage(updatedSession, players)
    syncPlayersForNames(extractNamesFromSession(normalizedSession))
    setSessions((prev) => prev.map((s) => (s.id === normalizedSession.id ? normalizedSession : s)))

    setViewingSession((prev) => (prev?.id === normalizedSession.id ? normalizedSession : prev))

    if (mongoApi.isConfigured) {
      void runToastMutation(
        mongoApi.updateSession(normalizedSession),
        {
          pending: 'Đang cập nhật phiên...',
          success: 'Đã cập nhật phiên',
          error: 'Không thể cập nhật phiên',
        }
      )
    }
  }, [extractNamesFromSession, normalizeSessionForStorage, players, runToastMutation, syncPlayersForNames])

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
    syncPlayersForNames(extractNamesFromSession(session))
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
  }, [extractNamesFromSession, players, syncPlayersForNames])

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
        if (!Array.isArray(imported)) {
          toast.error('File không hợp lệ')
          return
        }
        const existingIds = new Set(sessions.map((s) => s.id))
        const normalizedImported = imported.map((s) => normalizeSessionForStorage(s))
        const newOnes = normalizedImported.filter((s) => !existingIds.has(s.id))
        syncPlayersForNames(getSessionPeople(newOnes))
        setSessions((prev) => {
          const merged = [...newOnes, ...prev]
          if (mongoApi.isConfigured && newOnes.length) {
            void runToastMutation(
              mongoApi.importSessions(newOnes),
              {
                pending: 'Đang nhập các phiên...',
                success: `Đã nhập ${newOnes.length} phiên`,
                error: 'Không thể nhập phiên',
              }
            )
          }
          return merged
        })
        toast.success(`Đã import ${imported.length} phiên`)
      } catch {
        toast.error('Không đọc được file JSON')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [normalizeSessionForStorage, runToastMutation, sessions, syncPlayersForNames])

  const handleEditPlayer = useCallback(async (player, newName, avatarSource) => {
    // player: object { id, name } passed from PlayersPage
    const id = player.id
    const newNameTrim = String(newName || '').trim()
    if (!newNameTrim) return
    const avatarSourceProvided = avatarSource !== undefined
    const avatarSourceTrim = avatarSourceProvided ? String(avatarSource || '').trim() : undefined
    const nextAvatarSource = avatarSourceProvided ? (avatarSourceTrim) : (player.avatarSource || '')
    if (newNameTrim === player.name && nextAvatarSource === (player.avatarSource || '')) return

    // No need to update sessions (they reference ids). Only persist player name change.
    if (mongoApi.isConfigured) {
      const result = await runToastMutation(
        mongoApi.updatePlayer(id, { name: newNameTrim, avatarSource: nextAvatarSource }),
        {
          pending: 'Đang cập nhật người chơi...',
          success: 'Đã cập nhật người chơi',
          error: 'Không thể cập nhật người chơi',
        }
      )
      const savedPlayer = result?.player
      if (savedPlayer) {
        setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...savedPlayer } : p)))
      }
    } else {
      setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: newNameTrim, avatarSource: nextAvatarSource } : p)))
    }
  }, [runToastMutation])

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
    if (inUseLocal) return toast.error('Không thể xóa: người chơi đã tham gia session')

    // Only remove locally after backend confirms deletion. If no backend, allow local delete.
    if (!mongoApi.isConfigured) {
      setPlayers((prev) => prev.filter((p) => p.id !== player.id))
      return
    }

    try {
      await runToastMutation(
        mongoApi.removePlayer(player.id),
        {
          pending: 'Đang xóa người chơi...',
          success: 'Đã xóa người chơi',
          error: (err) => {
            const msg = String(err?.message || '')
            if (msg.includes('player_in_sessions') || msg.includes('409')) {
              return 'Không thể xóa: người chơi đã tham gia session'
            }
            if (msg.includes('404')) {
              return 'Người chơi không tồn tại'
            }
            return 'Lỗi khi xóa người chơi'
          },
        }
      )
      setPlayers((prev) => prev.filter((p) => p.id !== player.id))
    } catch (err) {
      console.error('Delete player error:', err)
    }
  }, [])

  const handleEditExpenseType = useCallback((value, updated) => {
    setExpenseTypes((prev) => prev.map((t) => (t.value === value ? updated : t)))
    if (mongoApi.isConfigured) {
      void runToastMutation(
        mongoApi.updateExpenseType(value, updated),
        {
          pending: 'Đang cập nhật loại kinh phí...',
          success: 'Đã cập nhật loại kinh phí',
          error: 'Không thể cập nhật loại kinh phí',
        }
      )
    }
  }, [runToastMutation])

  const handleDeleteExpenseType = useCallback((value) => {
    // only delete if no session uses this type
    const inUse = sessions.some((s) => (s.entries || []).some((e) => e.type === value))
    if (inUse) return toast.error('Không thể xóa: loại này đang được sử dụng trong phiên')
    setExpenseTypes((prev) => prev.filter((t) => t.value !== value))
    if (mongoApi.isConfigured) {
      void runToastMutation(
        mongoApi.removeExpenseType(value),
        {
          pending: 'Đang xóa loại kinh phí...',
          success: 'Đã xóa loại kinh phí',
          error: 'Không thể xóa loại kinh phí',
        }
      )
    }
  }, [sessions, runToastMutation])

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
    const nextAvatarSource = editPlayerAvatarSource.trim()
    if (!player) return
    if (player.name === newName && (player.avatarSource || '') === nextAvatarSource) return
    void handleEditPlayer(player, newName, nextAvatarSource)
    setIsEditPlayerModalOpen(false)
    setEditPlayerId('')
    setEditPlayerNewName('')
    setEditPlayerAvatarSource('')
  }, [editPlayerAvatarSource, editPlayerId, editPlayerNewName, handleEditPlayer, players])

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

    const idToName = new Map((players || []).map((p) => [String(p.id), String(p.name || '')]))
    const resolveParticipantName = (value) => {
      if (!value && value !== 0) return ''
      if (typeof value === 'object') {
        const rawId = value.id != null ? String(value.id) : ''
        const rawName = String(value.name || '').trim()
        if (rawId && idToName.has(rawId)) return idToName.get(rawId)
        if (rawName) return rawName
        return rawId
      }
      const raw = String(value).trim()
      if (!raw) return ''
      return idToName.get(raw) || raw
    }

    // compute date span in months (inclusive)
    const dates = sessions
      .map((s) => new Date(s.date))
      .filter((d) => !Number.isNaN(d.getTime()))
    const monthsSpan = (() => {
      if (dates.length === 0) return 1
      const minDate = new Date(Math.min(...dates))
      const maxDate = new Date(Math.max(...dates))
      return (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1
    })()

    for (const session of sessions) {
      const participants = new Set()
      ;(session.entries || []).forEach((entry) => {
        const payerName = resolveParticipantName(entry.payer)
        if (payerName) participants.add(payerName)
        ;(entry.people || []).forEach((p) => {
          const name = resolveParticipantName(p)
          if (name) participants.add(name)
        })
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
  }, [sessions, players])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <img src="./src/files/icon.png" alt="Badminton" className="header-icon" />
          <div className="header-info">
            <h1> Tính tiền cầu lông</h1>
            <p>Chia tiền sân, cầu, trà đá, cơm</p>
          </div>
          <button
            className="hamburger btn btn-outline"
            aria-label="Toggle menu"
            onClick={() => setIsSidebarOpen((v) => !v)}
            style={{ display: 'none' }}
          >
            ☰
          </button>
          <a href="https://github.com/nxquan/badminton-calculator" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
            🐙 Contribution
          </a>
        </div>
        {dbStatus === 'error' && <span className="db-badge db-error" style={{ marginTop: 8 }}>🔴 Lỗi kết nối DB</span>}
      </header>

      <div className="app-layout" style={{ display: 'flex', gap: 16 }}>
        <Sidebar
          className={isSidebarOpen ? 'mobile-open' : 'collapsed'}
          onSelectMenu={(view) => { setSidebarView({ view, session: null }); setIsSidebarOpen(false) }}
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
                onSyncPlayers={() => syncPlayersForNames(getSessionPeople(sessions))}
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
                  setPlayerAvatarSource('')
                  setIsAddPlayerModalOpen(true)
                }}
                onEditClick={(p) => {
                  setEditPlayerId(p.id)
                  setEditPlayerNewName(p.name)
                  setEditPlayerAvatarSource(p.avatarSource || '')
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
                      await runToastMutation(
                        mongoApi.upsertCombos(next),
                        {
                          pending: 'Đang lưu combo...',
                          success: 'Đã lưu combo',
                          error: 'Không thể lưu combo',
                        }
                      )
                    } else {
                      // fallback to localStorage
                      const { saveCombos } = await import('./constants')
                      saveCombos(next)
                    }
                  } catch (e) {
                    console.error(e)
                    if (!mongoApi.isConfigured) toast.error('Lỗi khi lưu combo')
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
                      await runToastMutation(
                        mongoApi.upsertCombos(next),
                        {
                          pending: 'Đang lưu combo...',
                          success: 'Đã lưu combo',
                          error: 'Không thể lưu combo',
                        }
                      )
                    } else {
                      const { saveCombos } = await import('./constants')
                      saveCombos(next)
                    }
                  } catch (e) {
                    console.error(e)
                    if (!mongoApi.isConfigured) toast.error('Lỗi khi lưu combo')
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
              <button className="modal-close" onClick={() => { setIsAddPlayerModalOpen(false); setPlayerAvatarSource('') }}>✕</button>
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
                    if (e.key === 'Enter') void handleCreatePlayer()
                  }}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Link avatar hoặc profile</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="Dán link Facebook, Instagram, hoặc link ảnh công khai..."
                    value={playerAvatarSource}
                    onChange={(e) => setPlayerAvatarSource(e.target.value)}
                    style={{ width: '100%', paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    aria-label="Clear avatar"
                    className="btn btn-outline"
                    onClick={() => setPlayerAvatarSource('')}
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '4px 8px', border: 'none' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
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
              <button className="modal-close" onClick={() => { setIsEditPlayerModalOpen(false); setEditPlayerAvatarSource('') }}>✕</button>
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
              <div className="form-group">
                <label>Link avatar hoặc profile</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="Dán link Facebook, Instagram, hoặc link ảnh công khai..."
                    value={editPlayerAvatarSource}
                    onChange={(e) => setEditPlayerAvatarSource(e.target.value)}
                    style={{ width: '100%', paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    aria-label="Clear avatar"
                    className="btn btn-outline"
                    onClick={() => setEditPlayerAvatarSource('')}
                    style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '4px 8px', border: 'none' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => { setIsEditPlayerModalOpen(false); setEditPlayerAvatarSource('') }}>Đóng</button>
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
          <div className="modal-content" style={{ maxWidth: '1400px', maxHeight: '90vh', padding: 16 }}>
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
      <ToastContainer position="top-right" autoClose={2200} newestOnTop closeOnClick pauseOnHover theme="colored" />
    </div>
  )
}
