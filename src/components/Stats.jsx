import { useState, useMemo } from 'react'
import { Filter, BarChart3, Trophy, Medal, Crown, TrendingUp, Calendar, Users, Zap } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { formatMoney, sortPlayerNames, sortExpenseTypes } from '../constants'

function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null

  const dataPoint = payload[0]?.payload || {}
  const totalAmount = dataPoint.total || 0
  const count = dataPoint.count || 0
  const activePlayers = dataPoint.activePlayersCount || 0
  const avgSession = count > 0 ? totalAmount / count : 0

  return (
    <div
      style={{
        background: '#0F172A',
        color: '#FFFFFF',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '0.82rem',
        boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        border: '1px solid #334155',
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 800, color: '#4ADE80', fontSize: '0.9rem', marginBottom: 6 }}>
        📅 {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: '#94A3B8' }}>💵 Tổng chi tiêu:</span>
        <strong style={{ color: '#22C55E' }}>{formatMoney(Math.round(totalAmount * 1000))}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: '#94A3B8' }}>🏸 Số phiên cầu:</span>
        <strong style={{ color: '#38BDF8' }}>{count} phiên</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
        <span style={{ color: '#94A3B8' }}>👥 Vận động viên tham gia:</span>
        <strong style={{ color: '#FB923C' }}>{activePlayers} người</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderTop: '1px solid #334155', paddingTop: 4, marginTop: 4 }}>
        <span style={{ color: '#94A3B8' }}>⚡ TB / phiên:</span>
        <strong style={{ color: '#FACC15' }}>{formatMoney(Math.round(avgSession * 1000))}</strong>
      </div>
    </div>
  )
}

function TrendLineChart({ data, groupMode }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94A3B8', fontSize: '0.88rem' }}>
        Chưa có dữ liệu tiến trình phát triển.
      </div>
    )
  }

  // Format Y-axis money labels
  const formatYAxisMoney = (val) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}M`
    if (val > 0) return `${Math.round(val)}k`
    return '0'
  }

  return (
    <div style={{ width: '100%', height: 320, marginTop: 10 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#64748B"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#16A34A"
            fontSize={11}
            tickFormatter={formatYAxisMoney}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#2563EB"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomChartTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '0.8rem', paddingBottom: 10 }}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="total"
            name="Tổng chi tiêu (VND)"
            stroke="#16A34A"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorTotal)"
            activeDot={{ r: 7, stroke: '#15803D', strokeWidth: 2 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="count"
            name="Số phiên cầu"
            stroke="#2563EB"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#FFFFFF', stroke: '#2563EB', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="activePlayersCount"
            name="Số tay vợt tham gia"
            stroke="#EA580C"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: '#FFFFFF', stroke: '#EA580C', strokeWidth: 1.5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function calcStats(sessions, expenseTypes = []) {
  const stats = {}

  for (const session of sessions) {
    for (const entry of session.entries) {
      if (!entry.people || entry.people.length === 0 || entry.amount <= 0) continue
      const amounts = Array.isArray(entry.amounts) ? entry.amounts : []
      for (let index = 0; index < entry.people.length; index += 1) {
        const rawPerson = entry.people[index]
        const amountForPerson = amounts.length === entry.people.length ? Number(amounts[index]) : entry.amount / entry.people.length
        if (!Number.isFinite(amountForPerson) || amountForPerson < 0) continue
        // Normalize person key: may be an id string, a name string, or an object { id, name }
        let personKey = rawPerson
        if (rawPerson && typeof rawPerson === 'object') {
          personKey = rawPerson.id || rawPerson.name || String(rawPerson)
        }
        if (!stats[personKey]) stats[personKey] = {}
        if (!stats[personKey][entry.type]) stats[personKey][entry.type] = 0
        stats[personKey][entry.type] += amountForPerson
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
  if (index === 0) return { icon: <Crown size={14} style={{ color: '#BE185D', verticalAlign: 'middle' }} />, label: '', className: 'rank-diamond' }
  if (index === 1) return { icon: <Medal size={14} style={{ color: '#B45309', verticalAlign: 'middle' }} />, label: '', className: 'rank-gold' }
  if (index === 2) return { icon: <Medal size={14} style={{ color: '#475569', verticalAlign: 'middle' }} />, label: '', className: 'rank-silver' }
  return null
}

export default function Stats({ sessions, expenseTypes = [], players = [] }) {
  const [filterType, setFilterType] = useState('month')
  const [filterValue, setFilterValue] = useState('')
  const [trendGroupMode, setTrendGroupMode] = useState('month')
  const isMonthlyView = filterType === 'month'
  const isAllView = filterType === 'all'

  const monthOptions = useMemo(() => getMonthOptions(sessions), [sessions])

  const filteredSessions = useMemo(() => {
    if (!filterValue) return sessions
    if (filterType === 'date') return sessions.filter((s) => s.date === filterValue)
    if (filterType === 'month') return sessions.filter((s) => s.date?.startsWith(filterValue))
    return sessions
  }, [sessions, filterType, filterValue])

  const trendData = useMemo(() => {
    const sourceSessions = sessions
    if (!sourceSessions || sourceSessions.length === 0) return []

    const map = {}
    sourceSessions.forEach((s) => {
      if (!s.date) return
      const key = trendGroupMode === 'year' ? s.date.slice(0, 4) : s.date.slice(0, 7)
      if (!key) return
      if (!map[key]) {
        map[key] = { key, total: 0, count: 0, playerSet: new Set() }
      }
      const sessionTotal = (s.entries || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
      map[key].total += sessionTotal
      map[key].count += 1

      ;(s.entries || []).forEach((entry) => {
        if (entry.payer) map[key].playerSet.add(entry.payer)
        ;(entry.people || []).forEach((p) => {
          const name = typeof p === 'object' ? (p.name || p.id) : p
          if (name) map[key].playerSet.add(name)
        })
      })
    })

    const sortedKeys = Object.keys(map).sort((a, b) => a.localeCompare(b))
    return sortedKeys.map((key) => {
      let label = key
      if (trendGroupMode === 'month') {
        const [y, m] = key.split('-')
        label = `T${parseInt(m)}/${y}`
      } else {
        label = `Năm ${key}`
      }
      return {
        key,
        label,
        total: map[key].total,
        count: map[key].count,
        activePlayersCount: map[key].playerSet.size,
      }
    })
  }, [sessions, trendGroupMode])

  const trendSummary = useMemo(() => {
    if (trendData.length === 0) return { totalSpent: 0, peak: null, avgPerPeriod: 0, totalSessions: 0 }
    const totalSpent = trendData.reduce((s, d) => s + d.total, 0)
    const totalSessions = trendData.reduce((s, d) => s + d.count, 0)
    const avgPerPeriod = totalSpent / trendData.length
    let peak = trendData[0]
    trendData.forEach((d) => {
      if (d.total > peak.total) peak = d
    })
    return { totalSpent, peak, avgPerPeriod, totalSessions }
  }, [trendData])

  const stats = useMemo(() => calcStats(filteredSessions, expenseTypes), [filteredSessions, expenseTypes])
  const idToName = useMemo(() => Object.fromEntries((players || []).map((p) => [p.id, p.name])), [players])

  // normalize stats keys (ids) to names
  const statsByName = useMemo(() => {
    const out = {}
    for (const key of Object.keys(stats)) {
      // Try resolve key as id first, then as existing player name, otherwise look into sessions
      let name = idToName[key]

      if (!name) {
        const found = (players || []).find((p) => p.id === key || p.name === key)
        if (found) name = found.name
      }

      // Fallback: search filteredSessions for a matching person object that contains a name
      if (!name) {
        for (const session of filteredSessions) {
          for (const entry of session.entries || []) {
            const people = entry.people || []
            for (const p of people) {
              if (p && typeof p === 'object' && (String(p.id) === key || p.name === key)) {
                name = p.name || String(p.id)
                break
              }
              if ((typeof p === 'string' && p === key)) {
                name = p
                break
              }
            }
            if (name) break
          }
          if (name) break
        }
      }

      if (!name) name = key
      out[name] = { ...(out[name] || {}), ...(stats[key] || {}) }
    }
    return out
  }, [stats, idToName, players, filteredSessions])

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

  const rows = sortPlayerNames(Object.keys(statsByName))
    .map((name) => {
      const totals = { ...statsByName[name] }
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

  const activeMonthCount = useMemo(() => {
    if (!isAllView) return 0
    const months = new Set(
      sessions
        .map((s) => s.date?.slice(0, 7))
        .filter(Boolean)
    )
    return months.size
  }, [isAllView, sessions])

  const overallMonthlyAverage = activeMonthCount > 0 ? sumTotal / activeMonthCount : 0

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Filter size={18} style={{ color: '#16A34A' }} /> Bộ lọc
        </div>
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

      {/* Biểu đồ Thống kê Tiến trình (Progress Line Chart) */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: '#16A34A' }} /> Biểu đồ Thống kê Tiến trình
          </span>

          {/* Toggle Switch Theo Tháng / Theo Năm */}
          <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '3px', borderRadius: '999px', border: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={() => setTrendGroupMode('month')}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: trendGroupMode === 'month' ? '#FFFFFF' : 'transparent',
                color: trendGroupMode === 'month' ? '#15803D' : '#64748B',
                boxShadow: trendGroupMode === 'month' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              📅 Theo Tháng
            </button>
            <button
              type="button"
              onClick={() => setTrendGroupMode('year')}
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: trendGroupMode === 'year' ? '#FFFFFF' : 'transparent',
                color: trendGroupMode === 'year' ? '#15803D' : '#64748B',
                boxShadow: trendGroupMode === 'year' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              📆 Theo Năm
            </button>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: 12 }}>
            <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700 }}>📈 TỔNG KINH PHÍ TIẾN TRÌNH</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
              {formatMoney(Math.round(trendSummary.totalSpent * 1000))}
            </div>
          </div>
          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '10px 14px', borderRadius: 12 }}>
            <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 700 }}>
              🏆 KỲ CAO NHẤT {trendSummary.peak ? `(${trendSummary.peak.label})` : ''}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
              {trendSummary.peak ? formatMoney(Math.round(trendSummary.peak.total * 1000)) : '0 VND'}
            </div>
          </div>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px 14px', borderRadius: 12 }}>
            <div style={{ fontSize: '0.72rem', color: '#1D4ED8', fontWeight: 700 }}>⚡ TRUNG BÌNH MỖI KỲ</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
              {formatMoney(Math.round(trendSummary.avgPerPeriod * 1000))}
            </div>
          </div>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '10px 14px', borderRadius: 12 }}>
            <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>🏸 TỔNG SỐ PHIÊN</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
              {trendSummary.totalSessions} phiên cầu
            </div>
          </div>
        </div>

        {/* Interactive Line Chart */}
        <TrendLineChart data={trendData} groupMode={trendGroupMode} />
      </div>

      <div className="card">
        <div className="card-title">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={18} style={{ color: '#16A34A' }} /> Thống kê chi tiêu
          </span>
          {filterValue
            ? filterType === 'month'
              ? ` — ${formatMonth(filterValue)}`
              : ` — ${new Date(filterValue).toLocaleDateString('vi-VN')}`
            : ' — Tất cả'}
        </div>

        {rows.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
            {rows.slice(0, 3).map((topRow, idx) => {
              const badges = [
                { title: '🥇 QUÁN QUÂN', bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', border: '#F59E0B', color: '#92400E', nameColor: '#0F172A' },
                { title: '🥈 Á QUÂN I', bg: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)', border: '#94A3B8', color: '#475569', nameColor: '#0F172A' },
                { title: '🥉 Á QUÂN II', bg: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)', border: '#F97316', color: '#9A3412', nameColor: '#0F172A' }
              ]
              const b = badges[idx]
              return (
                <div key={topRow.name} style={{
                  background: b.bg,
                  border: `1.5px solid ${b.border}`,
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: b.color, letterSpacing: '0.05em' }}>{b.title}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: b.nameColor }}>{topRow.name}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: b.color }}>
                    {formatMoney(Math.round(topRow.total * 1000))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
                  <th>Vận động viên</th>
                  {usedExpenseTypes.map((type) => (
                    <th key={type.value} style={{ fontSize: '0.85rem' }}>
                      {type.emoji} {type.label}
                    </th>
                  ))}
                  <th>Tổng chi</th>
                  {isAllView && <th className="stats-monthly-header">TB / tháng</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rankInfo = getMonthlyRank(i)
                  const monthlyAverage = activeMonthCount > 0 ? row.total / activeMonthCount : 0
                  return (
                    <tr key={row.name}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>
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
                      {isAllView && (
                        <td className="stats-monthly-cell">
                          {activeMonthCount > 0 ? formatMoney(Math.round(monthlyAverage * 1000)) : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                        </td>
                      )}
                    </tr>
                  )
                })}
                <tr className="result-total">
                  <td colSpan={2}>TỔNG</td>
                  {usedExpenseTypes.map((type) => (
                    <td key={type.value}>
                      {formatMoney(Math.round(columnSums[type.value] * 1000))}
                    </td>
                  ))}
                  <td>{formatMoney(Math.round(sumTotal * 1000))}</td>
                  {isAllView && (
                    <td className="stats-monthly-cell stats-monthly-total">
                      {activeMonthCount > 0 ? formatMoney(Math.round(overallMonthlyAverage * 1000)) : '—'}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
