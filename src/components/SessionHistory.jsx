import { Fragment, useMemo, useState, useEffect } from 'react'
import { Filter, Trash2, CheckCircle2, CreditCard, Wallet, Layers, CheckSquare, Square, ArrowRight, Eye, UserX } from 'lucide-react'
import { formatMoney, calculateTotals, getEntryLabel } from '../constants'
import ConsolidateSessionsModal from './ConsolidateSessionsModal'

function parseSessionDate(dateValue) {
  if (!dateValue) return null

  const rawValue = String(dateValue)
  const normalizedValue = rawValue.length === 10 ? `${rawValue}T00:00:00` : rawValue
  const parsedDate = new Date(normalizedValue)

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function startOfWeek(date) {
  const result = new Date(date)
  const offset = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - offset)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfWeek(date) {
  const result = new Date(date)
  result.setDate(result.getDate() + 6)
  result.setHours(23, 59, 59, 999)
  return result
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayTitle(date) {
  const weekday = date.getDay()

  if (weekday === 0) return 'Chủ nhật'

  return `Thứ ${weekday + 1}`
}

function formatWeekTitle(weekNumber, startDate, endDate) {
  const formatDate = (date, includeYear = true) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()

    return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`
  }
  const sameMonth = startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()

  return {
    weekNumber,
    label: `Tuần ${weekNumber}`,
    range: `(${formatDate(startDate, !sameMonth)} - ${formatDate(endDate)})`,
  }
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isSessionFullySettled(session, idToNameMap = {}) {
  if (!session || !session.entries || session.entries.length === 0) return true
  const totals = calculateTotals(session.entries || [])
  const settledList = (session.settledPlayers || []).map(String)
  const transferTo = session.transferTo || ''

  const sessionParticipantsSet = new Set()
  const nameToIdMap = {}

  for (const e of session.entries || []) {
    for (const p of e.people || []) {
      const pId = typeof p === 'object' ? String(p.id || p.name || '') : String(p)
      const pName = typeof p === 'object' ? (p.name || p.id) : (idToNameMap[pId] || pId)
      if (pName) {
        sessionParticipantsSet.add(pName)
        if (pId) nameToIdMap[pName] = pId
      }
    }
  }

  const sessionParticipantList = Array.from(sessionParticipantsSet)
  const totalCount = sessionParticipantList.length
  if (totalCount === 0) return true

  let settledCount = 0
  for (const name of sessionParticipantList) {
    const pId = nameToIdMap[name] || name

    const isTransferTarget = Boolean(transferTo && (transferTo === name || transferTo === pId))
    const isExplicitlySettled = settledList.includes(name) || (pId && settledList.includes(pId))

    const paidUpfront = (session.entries || [])
      .filter((e) => {
        const payerKey = typeof e.payer === 'object' ? (e.payer.name || e.payer.id) : e.payer
        return payerKey === name || payerKey === pId
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const share = (totals[pId] !== undefined ? totals[pId] : totals[name]) || 0
    const owe = share - paidUpfront

    const isSettled = isTransferTarget || isExplicitlySettled || owe <= 0
    if (isSettled) {
      settledCount += 1
    }
  }

  return settledCount === totalCount
}

export default function SessionHistory({ sessions, players = [], expenseTypes, onView, onDelete }) {
  const [monthFilter, setMonthFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('sessionHistory.monthFilter')
      if (saved !== null) {
        return saved
      }
    } catch { }
    return new Date().toISOString().slice(0, 7)
  })

  const [showUnsettledNames, setShowUnsettledNames] = useState(() => {
    try {
      return localStorage.getItem('sessionHistory.showUnsettledNames') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('sessionHistory.showUnsettledNames', String(showUnsettledNames))
    } catch { }
  }, [showUnsettledNames])

  const idToNameMap = useMemo(() => {
    const map = {}
    for (const p of players || []) {
      if (p && p.id) {
        map[String(p.id)] = p.name || String(p.id)
      }
    }
    return map
  }, [players])

  const months = useMemo(() => {
    const setMonths = new Set()
    for (const s of sessions) {
      if (s && s.date) setMonths.add(String(s.date).slice(0, 7))
    }
    const arr = [...setMonths].filter(Boolean).sort((a, b) => b.localeCompare(a))
    const current = new Date().toISOString().slice(0, 7)
    if (!arr.includes(current)) arr.unshift(current)
    return arr
  }, [sessions])

  const filteredSessions = useMemo(() => {
    const list = monthFilter ? sessions.filter((s) => String(s.date || '').startsWith(monthFilter)) : sessions.slice()
    // Sort by date descending (newest first)
    return list.slice().sort((a, b) => {
      const ta = a && a.date ? new Date(a.date).getTime() : 0
      const tb = b && b.date ? new Date(b.date).getTime() : 0
      return tb - ta
    })
  }, [sessions, monthFilter])

  const unsettledFilteredSessions = useMemo(() => {
    return filteredSessions.filter((s) => !isSessionFullySettled(s, idToNameMap))
  }, [filteredSessions, idToNameMap])

  const totalFilteredCount = filteredSessions.length
  const settledFilteredSessionsCount = useMemo(() => {
    return filteredSessions.filter((s) => isSessionFullySettled(s, idToNameMap)).length
  }, [filteredSessions, idToNameMap])
  const unsettledFilteredCount = totalFilteredCount - settledFilteredSessionsCount
  const settledPercent = totalFilteredCount > 0 ? Math.round((settledFilteredSessionsCount / totalFilteredCount) * 100) : 0

  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState([])
  const [showConsolidateModal, setShowConsolidateModal] = useState(false)

  const selectedSessions = useMemo(() => {
    return sessions.filter((s) => selectedSessionIds.includes(s?.id) && !isSessionFullySettled(s, idToNameMap))
  }, [sessions, selectedSessionIds, idToNameMap])

  const toggleSessionSelect = (session) => {
    if (!session || isSessionFullySettled(session, idToNameMap)) return
    setSelectedSessionIds((prev) =>
      prev.includes(session.id) ? prev.filter((id) => id !== session.id) : [...prev, session.id]
    )
  }

  const allFilteredSelected = useMemo(() => {
    if (unsettledFilteredSessions.length === 0) return false
    return unsettledFilteredSessions.every((s) => selectedSessionIds.includes(s.id))
  }, [unsettledFilteredSessions, selectedSessionIds])

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const unsettledIds = new Set(unsettledFilteredSessions.map((s) => s.id))
      setSelectedSessionIds((prev) => prev.filter((id) => !unsettledIds.has(id)))
    } else {
      const unsettledIds = unsettledFilteredSessions.map((s) => s.id)
      setSelectedSessionIds((prev) => Array.from(new Set([...prev, ...unsettledIds])))
    }
  }

  const groupedSessions = useMemo(() => {
    const groups = []
    let currentWeekGroup = null
    let currentDayGroup = null

    for (const session of filteredSessions) {
      const sessionDate = parseSessionDate(session?.date)
      if (!sessionDate) continue

      const weekStart = startOfWeek(sessionDate)
      const weekEnd = endOfWeek(weekStart)
      const weekKey = formatDateKey(weekStart)
      const dayKey = formatDateKey(sessionDate)
      const monthKey = getMonthKey(sessionDate)

      if (!currentWeekGroup || currentWeekGroup.key !== weekKey) {
        currentWeekGroup = {
          key: weekKey,
          monthKey,
          weekStart,
          weekEnd,
          title: null,
          days: [],
        }
        groups.push(currentWeekGroup)
        currentDayGroup = null
      }

      if (!currentDayGroup || currentDayGroup.key !== dayKey) {
        currentDayGroup = {
          key: dayKey,
          title: `${formatDayTitle(sessionDate)}, ${formatDateKey(sessionDate).split('-').reverse().join('/')}`,
          sessions: [],
        }
        currentWeekGroup.days.push(currentDayGroup)
      }

      currentDayGroup.sessions.push(session)
    }

    const monthGroups = new Map()
    for (const group of groups) {
      if (!monthGroups.has(group.monthKey)) {
        monthGroups.set(group.monthKey, [])
      }
      monthGroups.get(group.monthKey).push(group)
    }

    for (const groupList of monthGroups.values()) {
      groupList.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      groupList.forEach((group, index) => {
        group.title = formatWeekTitle(index + 1, group.weekStart, group.weekEnd)
      })
    }

    return groups
  }, [filteredSessions])

  const monthTotal = useMemo(() => {
    return filteredSessions.reduce((sum, session) => {
      const totals = calculateTotals(session.entries)
      const sessionTotal = Object.values(totals).reduce((sessionSum, value) => sessionSum + value, 0)
      return sum + sessionTotal
    }, 0)
  }, [filteredSessions])

  useEffect(() => {
    try {
      localStorage.setItem('sessionHistory.monthFilter', monthFilter)
    } catch (e) {
      // ignore
    }
  }, [monthFilter])

  return (
    <div>
      {/* Basic Stats Summary Bar */}
      <div style={{
        margin: '8px 16px 14px 16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
        gap: '10px'
      }}>
        {/* Stat 1: Tổng số phiên */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span>🏸</span> Tổng số phiên
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalFilteredCount} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>phiên</span>
          </div>
        </div>

        {/* Stat 2: Đã thanh toán */}
        <div style={{
          background: 'var(--color-court-green-soft, rgba(22, 163, 74, 0.08))',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} /> Đã thanh toán
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16A34A', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span>{settledFilteredSessionsCount}/{totalFilteredCount}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>({settledPercent}%)</span>
          </div>
        </div>

        {/* Stat 3: Chưa thanh toán */}
        <div style={{
          background: unsettledFilteredCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: unsettledFilteredCount > 0 ? '#B45309' : 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CreditCard size={13} /> Chưa hoàn tất
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: unsettledFilteredCount > 0 ? '#D97706' : 'var(--text-primary)' }}>
            {unsettledFilteredCount} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>phiên</span>
          </div>
        </div>

        {/* Stat 4: Tổng kinh phí */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.14) 100%)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Wallet size={13} /> Tổng tiền {monthFilter ? `Tháng ${Number(monthFilter.slice(5))}` : ''}
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563EB' }}>
            {formatMoney(Math.round(monthTotal * 1000))}
          </div>
        </div>
      </div>

      <div style={{ margin: '8px 16px 14px 16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flexShrink: 0, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Filter size={14} /> Lọc theo tháng:
        </label>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          style={{ minWidth: '150px', maxWidth: '190px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <option value="">Tất cả các tháng</option>
          {months.map((m) => (
            <option key={m} value={m}>{`Tháng ${String(Number(m.slice(5)))} / ${m.slice(0, 4)}`}</option>
          ))}
        </select>

        <button
          type="button"
          className={`btn btn-sm ${isMultiSelectMode ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => {
            setIsMultiSelectMode(!isMultiSelectMode)
            if (isMultiSelectMode) setSelectedSessionIds([])
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, borderRadius: '8px' }}
        >
          <Layers size={15} />
          {isMultiSelectMode ? 'Thoát gộp phiên' : 'Gộp phiên tính tiền'}
        </button>

        <button
          type="button"
          className={`btn btn-sm ${showUnsettledNames ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setShowUnsettledNames((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            borderRadius: '8px',
            background: showUnsettledNames ? undefined : 'var(--card-bg)',
          }}
          title="Bật/Tắt hiển thị tên những người chưa thanh toán trong cột Thanh toán"
        >
          <UserX size={15} />
          {showUnsettledNames ? '👁️ Đang hiện tên chưa TT' : '👁️ Hiện tên người chưa TT'}
        </button>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="empty-state">
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🏸</p>
            <p>Chưa có phiên đánh nào {monthFilter ? `trong Tháng ${Number(monthFilter.slice(5))}/${monthFilter.slice(0, 4)}` : ''}.</p>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 4 }}>Bấm "Phiên đánh mới" hoặc chọn tháng khác để xem!</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="result-table history-table">
            <thead>
              <tr>
                {isMultiSelectMode && (
                  <th style={{ textAlign: 'center', width: '42px' }}>
                    <button
                      type="button"
                      onClick={toggleSelectAllFiltered}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'inline-flex' }}
                      title={allFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    >
                      {allFilteredSelected ? <CheckSquare size={18} color="#16A34A" /> : <Square size={18} />}
                    </button>
                  </th>
                )}
                <th style={{ textAlign: 'center' }}>Ngày</th>
                <th style={{ textAlign: 'center' }}>Người</th>
                <th style={{ textAlign: 'center' }}>Số giờ CL</th>
                <th style={{ textAlign: 'center' }}>Thanh toán</th>
                <th style={{ textAlign: 'center' }}>Ghi chú</th>
                <th style={{ textAlign: 'center' }}>Tổng</th>
                <th style={{ textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {groupedSessions.map((weekGroup) => (
                <Fragment key={weekGroup.key}>
                  <tr className="history-group-row history-week-row">
                    <td colSpan={isMultiSelectMode ? 8 : 7} style={{ whiteSpace: 'nowrap', fontWeight: 800, textAlign: 'left' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '30px',
                          padding: '2px 8px',
                          marginRight: '8px',
                          borderRadius: '999px',
                          background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)',
                          color: '#7c2d12',
                          boxShadow: '0 1px 2px rgba(124, 45, 18, 0.18)',
                        }}
                      >
                        {weekGroup.title.label}
                      </span>
                      <span>{weekGroup.title.range}</span>
                    </td>
                  </tr>
                  {weekGroup.days.map((dayGroup) => (
                    <Fragment key={dayGroup.key}>
                      {dayGroup.sessions.map((session, index) => {
                        const totals = calculateTotals(session.entries || [])
                        const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
                        const playerCount = new Set((session.entries || []).flatMap((e) => (e.people || []).map(p => typeof p === 'object' ? (p.name || p.id) : p))).size

                        const totalHours = (session.entries || [])
                          .filter((e) => e.hours && e.hours > 0)
                          .reduce((sum, e) => sum + e.hours, 0)

                        const details = (session.entries || [])
                          .map((e) => {
                            const label = getEntryLabel(e, expenseTypes)
                            return e.note.length > 0 ? label : null
                          })
                          .filter(Boolean)

                        // Calculate payment settlement status (Đã thanh toán / Tổng số người chơi)
                        const settledList = (session.settledPlayers || []).map(String)
                        const transferTo = session.transferTo || ''

                        // Collect unique participant names/IDs for this session
                        const sessionParticipantsSet = new Set()
                        const nameToIdMap = {}

                        for (const e of session.entries || []) {
                          for (const p of e.people || []) {
                            const pId = typeof p === 'object' ? String(p.id || p.name || '') : String(p)
                            const pName = typeof p === 'object' ? (p.name || p.id) : (idToNameMap[pId] || pId)
                            if (pName) {
                              sessionParticipantsSet.add(pName)
                              if (pId) nameToIdMap[pName] = pId
                            }
                          }
                        }

                        const sessionParticipantList = Array.from(sessionParticipantsSet)
                        const totalCount = sessionParticipantList.length

                        let settledCount = 0
                        const unsettledMembers = []

                        for (const name of sessionParticipantList) {
                          const pId = nameToIdMap[name] || name

                          const isTransferTarget = Boolean(transferTo && (transferTo === name || transferTo === pId))
                          const isExplicitlySettled = settledList.includes(name) || (pId && settledList.includes(pId))

                          // Calculate upfront payments vs share spent
                          const paidUpfront = (session.entries || [])
                            .filter((e) => {
                              const payerKey = typeof e.payer === 'object' ? (e.payer.name || e.payer.id) : e.payer
                              return payerKey === name || payerKey === pId
                            })
                            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

                          const share = (totals[pId] !== undefined ? totals[pId] : totals[name]) || 0
                          const owe = share - paidUpfront

                          const isSettled = isTransferTarget || isExplicitlySettled || owe <= 0

                          if (isSettled) {
                            settledCount += 1
                          } else {
                            unsettledMembers.push(name)
                          }
                        }

                        const isFullySettled = totalCount > 0 ? settledCount === totalCount : true
                        const isSelected = selectedSessionIds.includes(session.id)

                        return (
                          <tr
                            key={session.id}
                            className={`history-row ${isSelected ? 'selected-row' : ''}`}
                            onClick={() => {
                              if (isMultiSelectMode) {
                                if (!isFullySettled) toggleSessionSelect(session)
                              } else {
                                onView(session)
                              }
                            }}
                            style={{
                              cursor: isMultiSelectMode && isFullySettled ? 'not-allowed' : 'pointer',
                              opacity: isMultiSelectMode && isFullySettled ? 0.65 : 1,
                              backgroundColor: isSelected ? '#F0FDF4' : undefined,
                            }}
                          >
                            {isMultiSelectMode && (
                              <td
                                style={{ textAlign: 'center', verticalAlign: 'middle' }}
                                onClick={(e) => e.stopPropagation()}
                                title={isFullySettled ? 'Phiên này đã hoàn tất thanh toán, không thể gộp' : undefined}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isFullySettled}
                                  onChange={() => toggleSessionSelect(session)}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: isFullySettled ? 'not-allowed' : 'pointer',
                                    opacity: isFullySettled ? 0.4 : 1,
                                    accentColor: '#16A34A',
                                  }}
                                />
                              </td>
                            )}
                            {index === 0 && (
                              <td
                                rowSpan={dayGroup.sessions.length}
                                className="history-day-cell"
                                style={{ whiteSpace: 'nowrap', fontWeight: 700, verticalAlign: 'middle' }}
                              >
                                {dayGroup.title}
                              </td>
                            )}
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{playerCount}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'red' }}>{totalHours > 0 ? `${totalHours}h` : '-'}</td>
                            <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                {totalCount === 0 ? (
                                  <span style={{ color: '#16A34A', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={14} /> Hoàn tất
                                  </span>
                                ) : isFullySettled ? (
                                  <span style={{
                                    color: '#15803D',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    background: '#DCFCE7',
                                    padding: '3px 10px',
                                    borderRadius: '999px',
                                    border: '1px solid #86EFAC',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    <CheckCircle2 size={13} /> {settledCount}/{totalCount}
                                  </span>
                                ) : (
                                  <span style={{
                                    color: '#B45309',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    background: '#FEF3C7',
                                    padding: '3px 10px',
                                    borderRadius: '999px',
                                    border: '1px solid #FDE68A',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    <CreditCard size={13} /> {settledCount}/{totalCount}
                                  </span>
                                )}

                                {showUnsettledNames && unsettledMembers.length > 0 && (
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: '4px',
                                      justifyContent: 'center',
                                      marginTop: '4px',
                                      maxWidth: '220px',
                                    }}
                                  >
                                    {unsettledMembers.map((unsettledName) => (
                                      <span
                                        key={unsettledName}
                                        style={{
                                          fontSize: '0.73rem',
                                          fontWeight: 700,
                                          color: '#B45309',
                                          background: '#FFFBEB',
                                          border: '1px solid #FCD34D',
                                          padding: '2px 7px',
                                          borderRadius: '6px',
                                          whiteSpace: 'nowrap',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                      >
                                        <span style={{ fontSize: '0.68rem' }}>⚠️</span>
                                        <span>{unsettledName}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <div>{details.map((detail) => <div key={detail}>{detail}</div>)}</div>
                            </td>
                             <td style={{
                               textAlign: 'center',
                               whiteSpace: 'nowrap',
                               fontWeight: 600,
                               color: grandTotal > 1000 ? '#ef4444' : 'inherit',
                               borderRadius: grandTotal > 1000 ? '4px' : 'inherit'
                             }}>
                               {formatMoney(Math.round(grandTotal * 1000))}
                             </td>
                             <td style={{ textAlign: 'center' }}>
                              {(!session?.settledPlayers || !session?.settledPlayers?.length) && (
                                <button
                                  className="btn btn-danger-soft btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (window.confirm('Xóa phiên đánh này?')) {
                                      onDelete(session.id)
                                    }
                                  }}
                                  title="Xóa phiên đánh"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isMultiSelectMode && selectedSessionIds.length > 0 && (
        <div style={{
          position: 'sticky',
          bottom: '16px',
          margin: '16px 16px 0 16px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.4), 0 8px 10px -6px rgba(22, 163, 74, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 40,
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Đã chọn <span style={{ fontSize: '1.15rem', color: '#FEF08A', fontWeight: 900 }}>{selectedSessionIds.length}</span> phiên đánh
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '8px' }}
              onClick={() => setSelectedSessionIds([])}
            >
              Bỏ chọn tất cả
            </button>
            <button
              type="button"
              className="btn btn-warning"
              style={{ fontWeight: 800, padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: '10px' }}
              onClick={() => setShowConsolidateModal(true)}
            >
              Tính tiền & Xuất Bill <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showConsolidateModal && (
        <ConsolidateSessionsModal
          sessions={selectedSessions}
          players={players}
          expenseTypes={expenseTypes}
          onClose={() => setShowConsolidateModal(false)}
        />
      )}
    </div>
  )
}
