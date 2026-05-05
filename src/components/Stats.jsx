import { useState, useMemo } from 'react'
import { formatMoney, sortPlayerNames } from '../constants'

function calcStats(sessions) {
  const stats = {}

  for (const session of sessions) {
    for (const entry of session.entries) {
      if (!entry.people || entry.people.length === 0 || entry.amount <= 0) continue
      const perPerson = entry.amount / entry.people.length
      for (const person of entry.people) {
        if (!stats[person]) stats[person] = { sport: 0, food: 0 }
        if (entry.type === 'com') {
          stats[person].food += perPerson
        } else {
          stats[person].sport += perPerson
        }
      }
    }
  }

  return stats
}

function getMonthOptions(sessions) {
  const months = new Set(
    sessions.map((s) => s.date?.slice(0, 7)).filter(Boolean)
  )
  return [...months].sort((a, b) => b.localeCompare(a))
}

function formatMonth(ym) {
  const [y, m] = ym.split('-')
  return `Tháng ${parseInt(m)}/${y}`
}

function getMonthlyRank(index) {
  if (index === 0) return { icon: '💎', label: 'Kim cương', className: 'rank-diamond' }
  if (index === 1) return { icon: '🥇', label: 'Vàng', className: 'rank-gold' }
  if (index === 2) return { icon: '🥈', label: 'Bạc', className: 'rank-silver' }
  return null
}

export default function Stats({ sessions }) {
  const [filterType, setFilterType] = useState('month')
  const [filterValue, setFilterValue] = useState('')
  const isMonthlyView = filterType === 'month'

  const monthOptions = useMemo(() => getMonthOptions(sessions), [sessions])

  const filteredSessions = useMemo(() => {
    if (!filterValue) return sessions
    if (filterType === 'date') return sessions.filter((s) => s.date === filterValue)
    if (filterType === 'month') return sessions.filter((s) => s.date?.startsWith(filterValue))
    return sessions
  }, [sessions, filterType, filterValue])

  const stats = useMemo(() => calcStats(filteredSessions), [filteredSessions])

  const rows = sortPlayerNames(Object.keys(stats))
    .map((name) => ({
      name,
      sport: stats[name].sport,
      food: stats[name].food,
      total: stats[name].sport + stats[name].food,
    }))
    .sort((a, b) => b.total - a.total)

  const sumSport = rows.reduce((s, r) => s + r.sport, 0)
  const sumFood = rows.reduce((s, r) => s + r.food, 0)
  const sumTotal = rows.reduce((s, r) => s + r.total, 0)

  const sessionCount = filteredSessions.length

  return (
    <div>
      <div className="card">
        <div className="card-title">🔍 Bộ lọc</div>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '0 0 auto', minWidth: '130px' }}>
            <label>Loại lọc</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setFilterValue('') }}
            >
              <option value="month">Theo tháng</option>
              <option value="date">Theo ngày</option>
              <option value="all">Tất cả</option>
            </select>
          </div>

          {filterType === 'month' && (
            <div className="form-group" style={{ flex: '0 0 auto', minWidth: '160px' }}>
              <label>Tháng</label>
              <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                <option value="">— Tất cả tháng —</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{formatMonth(m)}</option>
                ))}
              </select>
            </div>
          )}

          {filterType === 'date' && (
            <div className="form-group" style={{ flex: '0 0 auto', minWidth: '160px' }}>
              <label>Ngày</label>
              <input
                type="date"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              />
            </div>
          )}

          <div style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            {sessionCount} phiên
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          📊 Thống kê chi tiêu
          {filterValue
            ? filterType === 'month'
              ? ` — ${formatMonth(filterValue)}`
              : ` — ${new Date(filterValue).toLocaleDateString('vi-VN')}`
            : ' — Tất cả'}
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <p>Không có dữ liệu cho bộ lọc này.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="result-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Thành viên</th>
                  <th>🏸 Cầu lông</th>
                  <th>🍚 Tiền ăn</th>
                  <th>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rankInfo = isMonthlyView ? getMonthlyRank(i) : null
                  return (
                    <tr key={row.name}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>
                        <span className="stats-member-name">{row.name}</span>
                        {rankInfo && (
                          <span className={`stats-rank-badge ${rankInfo.className}`}>
                            {rankInfo.icon} {rankInfo.label}
                          </span>
                        )}
                      </td>
                      <td>{formatMoney(Math.round(row.sport * 1000))}</td>
                      <td>{row.food > 0 ? formatMoney(Math.round(row.food * 1000)) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}</td>
                      <td className={`stats-total-cell ${rankInfo ? `stats-total-${rankInfo.className}` : ''}`}>
                        {formatMoney(Math.round(row.total * 1000))}
                      </td>
                    </tr>
                  )
                })}
                <tr className="result-total">
                  <td colSpan={2}>Tổng cộng</td>
                  <td>{formatMoney(Math.round(sumSport * 1000))}</td>
                  <td>{formatMoney(Math.round(sumFood * 1000))}</td>
                  <td>{formatMoney(Math.round(sumTotal * 1000))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
