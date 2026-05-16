import { useMemo, useState, useEffect } from 'react'
import { formatMoney, calculateTotals, getEntryLabel } from '../constants'

export default function SessionHistory({ sessions, expenseTypes, onView, onDelete }) {
  const [monthFilter, setMonthFilter] = useState(() => {
    try {
      const stored = localStorage.getItem('sessionHistory.monthFilter')
      return stored !== null ? stored : new Date().toISOString().slice(0, 7)
    } catch (e) {
      return new Date().toISOString().slice(0, 7)
    }
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

  useEffect(() => {
    try {
      localStorage.setItem('sessionHistory.monthFilter', monthFilter)
    } catch (e) {
      // ignore
    }
  }, [monthFilter])

  return (
    <div>
      {filteredSessions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🏸</p>
            <p>Chưa có phiên đánh nào.</p>
            <p>Bấm "Phiên đánh mới" để bắt đầu!</p>
          </div>
        </div>
      ) : (
        <>
          {/* <div className="card-title">📜 Lịch sử ({sessions.length} phiên)</div> */}
          <div style={{ margin: '8px 16px 12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flexShrink: 0 }}>Lọc theo tháng</label>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="">Tất cả các tháng</option>
              {months.map((m) => (
                <option key={m} value={m}>{`Tháng ${String(Number(m.slice(5)))} / ${m.slice(0,4)}`}</option>
              ))}
            </select>
          </div>
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
                {filteredSessions.map((session) => {
                  const totals = calculateTotals(session.entries)
                  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
                  const playerCount = new Set(session.entries.flatMap((e) => e.people.map(p => p.id))).size
                  const isSpecialSession = session.entries.some((e) => (e.people || []).some((person) => person.name === 'Khánh'))
                  
                  // Calculate total hours
                  const totalHours = session.entries
                    .filter((e) => e.hours && e.hours > 0)
                    .reduce((sum, e) => sum + e.hours, 0)

                  const formattedDate = new Date(session.date).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })

                  let details = session.entries
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
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{formattedDate}</td>
                      <td>{playerCount}</td>
                      <td style={{ textAlign: 'center' }}>{totalHours > 0 ? `${totalHours}h` : '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: isSpecialSession ? 'var(--success)' : 'var(--text-secondary)' }}>
                        {isSpecialSession ? 'Có' : 'Không'}
                      </td>
                      <td>
                        <div >{details.map((detail) => <div key={detail}>{detail}</div>)}</div>
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
                          >
                            <span className="btn-icon" aria-hidden="true">✕</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
