import { useState, useMemo } from 'react'
import { formatMoney, sortPlayerNames, sortExpenseTypes } from '../constants'

function calcStats(sessions, expenseTypes = []) {
  const stats = {}

  for (const session of sessions) {
    for (const entry of session.entries) {
      if (!entry.people || entry.people.length === 0 || entry.amount <= 0) continue
      const perPerson = entry.amount / entry.people.length
      for (const person of entry.people) {
        if (!stats[person]) stats[person] = {}
        if (!stats[person][entry.type]) stats[person][entry.type] = 0
        stats[person][entry.type] += perPerson
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
  if (index === 0) return { icon: '💎', label: '', className: 'rank-diamond' }
  if (index === 1) return { icon: '🥇', label: '', className: 'rank-gold' }
  if (index === 2) return { icon: '🥈', label: '', className: 'rank-silver' }
  return null
}

export default function Stats({ sessions, expenseTypes = [] }) {
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

  const stats = useMemo(() => calcStats(filteredSessions, expenseTypes), [filteredSessions, expenseTypes])

  // Get all expense types used in filtered sessions
  const usedExpenseTypes = useMemo(() => {
    const typeSet = new Set()
    for (const session of filteredSessions) {
      for (const entry of session.entries || []) {
        typeSet.add(entry.type)
      }
    }
    const typeArray = [...typeSet].map(type => {
      const found = expenseTypes.find(t => t.value === type)
      return found || { value: type, label: type, emoji: '' }
    })
    return sortExpenseTypes(typeArray)
  }, [filteredSessions, expenseTypes])

  const rows = sortPlayerNames(Object.keys(stats))
    .map((name) => {
      const totals = { ...stats[name] }
      const total = Object.values(totals).reduce((s, v) => s + v, 0)
      return {
        name,
        totals,
        total,
      }
    })
    .sort((a, b) => b.total - a.total)

  // Calculate column sums for each expense type
  const columnSums = useMemo(() => {
    const sums = {}
    for (const type of usedExpenseTypes) {
      sums[type.value] = rows.reduce((s, r) => s + (r.totals[type.value] || 0), 0)
    }
    return sums
  }, [rows, usedExpenseTypes])

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
                  {usedExpenseTypes.map((type) => (
                    <th key={type.value} style={{ fontSize: '0.9rem' }}>
                      {type.emoji} {type.label}
                    </th>
                  ))}
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
                      {usedExpenseTypes.map((type) => {
                        const amount = row.totals[type.value] || 0
                        return (
                          <td key={type.value}>
                            {amount > 0 ? formatMoney(Math.round(amount * 1000)) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                          </td>
                        )
                      })}
                      <td className={`stats-total-cell ${rankInfo ? `stats-total-${rankInfo.className}` : ''}`}>
                        {formatMoney(Math.round(row.total * 1000))}
                      </td>
                    </tr>
                  )
                })}
                <tr className="result-total">
                  <td colSpan={2}>Tổng cộng</td>
                  {usedExpenseTypes.map((type) => (
                    <td key={type.value}>
                      {formatMoney(Math.round(columnSums[type.value] * 1000))}
                    </td>
                  ))}
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
