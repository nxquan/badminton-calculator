import { useState, useCallback, useRef, useEffect } from 'react'
import SessionForm from './components/SessionForm'
import Sidebar from './components/Sidebar'
import * as mongoApi from './services/mongoApi'
import { DEFAULT_EXPENSE_TYPES, getSessionPeople, sortExpenseTypes, sortPlayerNames } from './constants'
// Page imports
import SessionsPage from './pages/SessionsPage'
import SessionDetailPage from './pages/SessionDetailPage'
import PlayersPage from './pages/PlayersPage'
import ExpenseTypesPage from './pages/ExpenseTypesPage'
import StatsPage from './pages/StatsPage'
import EmptyPage from './pages/EmptyPage'

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
  const [playerNames, setPlayerNames] = useState([])
  const [expenseTypes, setExpenseTypes] = useState(DEFAULT_EXPENSE_TYPES)
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
  const [editPlayerOldName, setEditPlayerOldName] = useState('')
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

  const persistPlayerNames = useCallback((names) => {
    if (!names.length) return
    const nextNames = sortPlayerNames(names)
    setPlayerNames((prev) => sortPlayerNames([...prev, ...nextNames]))
    if (mongoApi.isConfigured) {
      mongoApi.upsertPlayers(nextNames).catch(console.error)
    }
  }, [])

  const extractNamesFromSession = useCallback((session) => {
    return getSessionPeople([session])
  }, [])

  const handleAddPlayerName = useCallback((name) => {
    persistPlayerNames([name])
  }, [persistPlayerNames])

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
    Promise.allSettled([mongoApi.getAllSessions(), mongoApi.getAllPlayers(), mongoApi.getAllExpenseTypes()])
      .then(([sessionsResult, namesResult, typesResult]) => {
        const localSessions = loadSessions()
        const docs = sessionsResult.status === 'fulfilled' ? sessionsResult.value : []
        const names = namesResult.status === 'fulfilled' ? namesResult.value : []
        const types = typesResult.status === 'fulfilled' ? typesResult.value : []
        const resolvedSessions = docs.length > 0 ? docs : localSessions

        if (docs.length === 0 && localSessions.length > 0) {
          mongoApi.importSessions(localSessions).catch(console.error)
        }

        setSessions(resolvedSessions)
        saveSessions(resolvedSessions)

        const derivedNames = getSessionPeople(resolvedSessions)
        const resolvedNames = sortPlayerNames(names)
        setPlayerNames(resolvedNames)

        if (names.length === 0 && derivedNames.length > 0) {
          mongoApi.upsertPlayers(derivedNames).catch(console.error)
        }

        const resolvedTypes = sortExpenseTypes([...DEFAULT_EXPENSE_TYPES, ...types])
        setExpenseTypes(resolvedTypes)

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
    persistPlayerNames(extractNamesFromSession(session))
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
  }, [extractNamesFromSession, persistPlayerNames, sessions])

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
    persistPlayerNames(extractNamesFromSession(updatedSession))
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
      saveSessions(next)
      return next
    })

    setViewingSession((prev) => (prev?.id === updatedSession.id ? updatedSession : prev))

    if (mongoApi.isConfigured) {
      mongoApi.updateSession(updatedSession).catch(console.error)
    }
  }, [extractNamesFromSession, persistPlayerNames])

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
    setViewingSession(null)
    setIsAddSessionModalOpen(false)
  }, [])

  const handleEditSession = useCallback((session) => {
    setCurrentSession(session)
    setIsEditingSessionInModal(true)
    setIsAddSessionModalOpen(true)
  }, [])

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
        persistPlayerNames(getSessionPeople(newOnes))
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

  const handleEditPlayer = useCallback((oldName, newName) => {
    setPlayerNames((prev) => prev.map((n) => (n === oldName ? newName : n)))
    
    // Update all sessions containing this player
    setSessions((prev) => {
      const updated = prev.map((session) => ({
        ...session,
        entries: (session.entries || []).map((entry) => ({
          ...entry,
          payer: entry.payer === oldName ? newName : entry.payer,
          people: (entry.people || []).map((p) => p === oldName ? newName : p),
        })),
      }))
      saveSessions(updated)
      if (mongoApi.isConfigured) {
        updated.forEach((session) => {
          mongoApi.updateSession(session).catch(console.error)
        })
      }
      return updated
    })
    
    // Update currently viewing session if affected
    setViewingSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        entries: (prev.entries || []).map((entry) => ({
          ...entry,
          payer: entry.payer === oldName ? newName : entry.payer,
          people: (entry.people || []).map((p) => p === oldName ? newName : p),
        })),
      }
    })
    
    if (mongoApi.isConfigured) {
      mongoApi.updatePlayer(oldName, newName).catch(console.error)
    }
  }, [])

  const handleDeletePlayer = useCallback((name) => {
    // remove from player list; sessions remain unchanged
    setPlayerNames((prev) => prev.filter((n) => n !== name))
    if (mongoApi.isConfigured) {
      mongoApi.removePlayer(name).catch(console.error)
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
    if (!newName || newName === editPlayerOldName) return
    handleEditPlayer(editPlayerOldName, newName)
    setIsEditPlayerModalOpen(false)
    setEditPlayerOldName('')
    setEditPlayerNewName('')
  }, [editPlayerOldName, editPlayerNewName, handleEditPlayer])

  const handleUpdateExpenseTypeFromModal = useCallback(() => {
    const label = editExpenseTypeLabel.trim()
    if (!label) return
    handleEditExpenseType(editExpenseTypeValue, { value: editExpenseTypeValue, label, emoji: editExpenseTypeEmoji })
    setIsEditExpenseTypeModalOpen(false)
    setEditExpenseTypeValue('')
    setEditExpenseTypeLabel('')
    setEditExpenseTypeEmoji('🧾')
  }, [editExpenseTypeValue, editExpenseTypeLabel, editExpenseTypeEmoji, handleEditExpenseType])




  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <img src="/src/files/icon.png" alt="Badminton" className="header-icon" />
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
              />
            )}
            {sidebarView.view === 'session' && viewingSession && (
              <SessionDetailPage
                session={viewingSession}
                expenseTypes={expenseTypes}
                onBack={() => { setViewingSession(null); setSidebarView({ view: 'sessions', session: null }) }}
                onUpdateSession={handleUpdateSession}
                onEditSession={handleEditSession}
              />
            )}
            {sidebarView.view === 'players' && (
              <PlayersPage
                playerNames={playerNames}
                onAddClick={() => {
                  setPlayerInputValue('')
                  setIsAddPlayerModalOpen(true)
                }}
                onEditClick={(p) => {
                  setEditPlayerOldName(p)
                  setEditPlayerNewName(p)
                  setIsEditPlayerModalOpen(true)
                }}
                onDeleteClick={handleDeletePlayer}
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
              />
            )}
            {!['sessions', 'session', 'players', 'types', 'stats'].includes(sidebarView.view) && (
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
          <div className="modal-content" style={{ maxWidth: '1000px', maxHeight: '90vh', padding: 16 }}>
            <div className="modal-header">
              <h2>{isEditingSessionInModal ? 'Chỉnh sửa phiên' : 'Phiên đánh mới'}</h2>
              <button className="modal-close" onClick={handleBack}>✕</button>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              <SessionForm
                session={currentSession}
                names={playerNames}
                expenseTypes={expenseTypes}
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
