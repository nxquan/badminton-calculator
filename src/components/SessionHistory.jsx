import { Fragment, useMemo, useState, useEffect } from 'react'
import { Filter, Trash2 } from 'lucide-react'
import { formatMoney, calculateTotals, getEntryLabel } from '../constants'

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

export default function SessionHistory({ sessions, expenseTypes, onView, onDelete }) {
  const [monthFilter, setMonthFilter] = useState(() => {
    return new Date().toISOString().slice(0, 7)
  })

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
          title: formatDayTitle(sessionDate),
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
      <div style={{ margin: '8px 16px 14px 16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
        <div style={{
          marginLeft: 'auto',
          padding: '6px 14px',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
          border: '1px solid #86EFAC',
          fontSize: '0.88rem',
          fontWeight: 800,
          color: '#15803D',
          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.12)',
        }}>
          Tổng tháng: {formatMoney(Math.round(monthTotal * 1000))}
        </div>
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
                  <th style={{textAlign: 'center'}}>Ngày</th>
                  <th style={{textAlign: 'center'}}>Người</th>
                  <th style={{textAlign: 'center'}}>Số giờ CL</th>
                  <th style={{textAlign: 'center'}}>Phiên đặc biệt</th>
                  <th style={{textAlign: 'center'}}>Ghi chú</th>
                  <th style={{textAlign: 'center'}}>Tổng</th>
                  <th style={{textAlign: 'center'}}></th>
                </tr>
              </thead>
              <tbody>
                {groupedSessions.map((weekGroup) => (
                  <Fragment key={weekGroup.key}>
                    <tr className="history-group-row history-week-row">
                      <td colSpan={8} style={{ whiteSpace: 'nowrap', fontWeight: 800, textAlign: 'left' }}>
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
                          const totals = calculateTotals(session.entries)
                          const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
                          const playerCount = new Set(session.entries.flatMap((e) => e.people.map(p => p.id))).size
                          const isSpecialSession = session.entries.some((e) => (e.people || []).some((person) => person.name === 'Khánh'))

                          const totalHours = session.entries
                            .filter((e) => e.hours && e.hours > 0)
                            .reduce((sum, e) => sum + e.hours, 0)

                          const details = session.entries
                            .map((e) => {
                              const label = getEntryLabel(e, expenseTypes)
                              return e.note.length > 0 ? label : null
                            })
                            .filter(Boolean)

                          return (
                            <tr
                              key={session.id}
                              className="history-row"
                              onClick={() => onView(session)}
                            >
                              {index === 0 && (
                                <td
                                  rowSpan={dayGroup.sessions.length}
                                  className="history-day-cell"
                                  style={{ whiteSpace: 'nowrap', fontWeight: 700, verticalAlign: 'middle' }}
                                >
                                  {dayGroup.title}
                                </td>
                              )}
                              <td>{playerCount}</td>
                              <td style={{ textAlign: 'center' }}>{totalHours > 0 ? `${totalHours}h` : '-'}</td>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: isSpecialSession ? 'var(--success)' : 'var(--text-secondary)' }}>
                                {isSpecialSession ? 'Có' : 'Không'}
                              </td>
                              <td>
                                <div>{details.map((detail) => <div key={detail}>{detail}</div>)}</div>
                              </td>
                              <td style={{
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                                color: grandTotal > 1000 ? '#ef4444' : 'inherit',
                                borderRadius: grandTotal > 1000 ? '4px' : 'inherit'
                              }}>
                                {formatMoney(Math.round(grandTotal * 1000))}
                              </td>
                              <td>
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
    </div>
  )
}
