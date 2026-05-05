import { useState, useCallback, useRef, useEffect } from 'react'
import SessionForm from './components/SessionForm'
import SessionResult from './components/SessionResult'
import SessionHistory from './components/SessionHistory'
import Stats from './components/Stats'
import * as mongoApi from './services/mongoApi'
import { DEFAULT_EXPENSE_TYPES, getSessionPeople, sortExpenseTypes, sortPlayerNames } from './constants'

const STORAGE_KEY = 'badminton-sessions'

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
  const [dbStatus, setDbStatus] = useState(mongoApi.isConfigured ? 'loading' : 'offline')
  const importRef = useRef(null)

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
        const resolvedNames = sortPlayerNames([...names, ...derivedNames])
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
    setCurrentSession({ id: crypto.randomUUID(), date: '', entries: [] })
    setViewingSession(null)
  }, [])

  const handleBack = useCallback(() => {
    setCurrentSession(null)
    setViewingSession(null)
  }, [])

  const handleEditSession = useCallback((session) => {
    setCurrentSession(session)
    setViewingSession(null)
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

  return (
    <div className="app">
      {!viewingSession && (
        <header className="app-header">
          <h1>🏸 Tính tiền cầu lông</h1>
          <p>Chia tiền sân, cầu, trà đá, cơm</p>
          {dbStatus === 'loading' && <span className="db-badge db-loading">⏳ Đang kết nối DB…</span>}
          {dbStatus === 'ready'   && <span className="db-badge db-ready">🟢 MongoDB</span>}
          {dbStatus === 'error'   && <span className="db-badge db-error">🔴 Lỗi kết nối DB</span>}
        </header>
      )}

      {currentSession ? (
        <SessionForm
          session={currentSession}
          names={playerNames}
          expenseTypes={expenseTypes}
          onAddPlayerName={handleAddPlayerName}
          onAddExpenseType={handleAddExpenseType}
          onSave={handleSaveSession}
          onCancel={handleBack}
        />
      ) : viewingSession ? (
        <SessionResult
          session={viewingSession}
          expenseTypes={expenseTypes}
          onBack={handleBack}
          onUpdateSession={handleUpdateSession}
          onEditSession={handleEditSession}
        />
      ) : (
        <>
          <div className="tab-bar">
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              📋 Lịch sử
            </button>
            <button
              className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              📊 Thống kê
            </button>
            <div className="tab-actions">
              <button className="btn btn-outline btn-sm" onClick={handleExport} title="Xuất JSON">
                ⬇ Export
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => importRef.current.click()} title="Nhập JSON">
                ⬆ Import
              </button>
              <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </div>
          </div>

          {activeTab === 'history' ? (
            <SessionHistory
              sessions={sessions}
              expenseTypes={expenseTypes}
              onNewSession={handleNewSession}
              onView={setViewingSession}
              onDelete={handleDeleteSession}
            />
          ) : (
            <Stats sessions={sessions} />
          )}
        </>
      )}
    </div>
  )
}
