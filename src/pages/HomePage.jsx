import { useState, useMemo } from 'react'
import { Plus, Calendar, Wallet, Users, Flame, BarChart3, ArrowRight, Search, ChevronDown, ChevronUp } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import PlayerAvatar from '../components/PlayerAvatar'
import { formatMoney } from '../constants'

function formatMonthTitle(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `T${parseInt(m, 10)}/${y.slice(2)}`
}

function formatFullMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `Tháng ${parseInt(m, 10)}/${y}`
}

function HomePageChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const dataPoint = payload[0]?.payload || {}

  return (
    <div
      style={{
        background: '#0F172A',
        color: '#FFFFFF',
        padding: '12px 16px',
        borderRadius: '12px',
        fontSize: '0.84rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        border: '1px solid #334155',
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 800, color: '#4ADE80', fontSize: '0.9rem', marginBottom: 6 }}>
        📅 {dataPoint.fullLabel || label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <span style={{ color: '#94A3B8' }}>💵 Kinh phí chi tiêu:</span>
        <strong style={{ color: '#22C55E' }}>{formatMoney(dataPoint.expense)}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#94A3B8' }}>🏸 Số phiên cầu:</span>
        <strong style={{ color: '#FB923C' }}>{dataPoint.sessions} phiên</strong>
      </div>
    </div>
  )
}

export default function HomePage({ sessions = [], players = [], expenseTypes = [], onNewSession, onViewSession, onNavigateTab }) {
  const [playerSearchTerm, setPlayerSearchTerm] = useState('')
  const [playerFilterPill, setPlayerFilterPill] = useState('all')
  const [visiblePlayerCount, setVisiblePlayerCount] = useState(5)

  // 1. Calculate Continuous Monthly Data for Chart (Includes months with 0 sessions)
  const monthlyData = useMemo(() => {
    const map = {}
    const dates = sessions.map((s) => s.date).filter(Boolean)
    const currentYear = new Date().getFullYear()

    let startYear = currentYear
    let startMonth = 0 // Jan
    let endYear = currentYear
    let endMonth = Math.max(new Date().getMonth(), 11) // Dec

    if (dates.length > 0) {
      const parsed = dates
        .map((d) => new Date(d.length === 10 ? `${d}T00:00:00` : d))
        .filter((d) => !isNaN(d.getTime()))

      if (parsed.length > 0) {
        const minD = new Date(Math.min(...parsed))
        const maxD = new Date(Math.max(...parsed))
        startYear = minD.getFullYear()
        startMonth = minD.getMonth()
        endYear = maxD.getFullYear()
        endMonth = Math.max(maxD.getMonth(), new Date().getMonth())
      }
    }

    // Generate continuous list of months
    const monthKeys = []
    let curY = startYear
    let curM = startMonth

    while (curY < endYear || (curY === endYear && curM <= endMonth)) {
      const monthKey = `${curY}-${String(curM + 1).padStart(2, '0')}`
      monthKeys.push(monthKey)
      map[monthKey] = { monthKey, sessionCount: 0, totalAmount: 0 }
      curM += 1
      if (curM > 11) {
        curM = 0
        curY += 1
      }
    }

    // Accumulate sessions data
    for (const session of sessions) {
      if (!session.date) continue
      const monthKey = session.date.slice(0, 7)
      if (!map[monthKey]) {
        map[monthKey] = { monthKey, sessionCount: 0, totalAmount: 0 }
        monthKeys.push(monthKey)
      }
      map[monthKey].sessionCount += 1

      for (const entry of session.entries || []) {
        if (!entry.amount || entry.amount <= 0) continue
        map[monthKey].totalAmount += entry.amount
      }
    }

    const uniqueSortedKeys = [...new Set(monthKeys)].sort()
    return uniqueSortedKeys.map((k) => map[k])
  }, [sessions])

  const homeChartData = useMemo(() => {
    return monthlyData.map((d) => ({
      label: formatMonthTitle(d.monthKey),
      fullLabel: formatFullMonth(d.monthKey),
      sessions: d.sessionCount,
      expense: Math.round(d.totalAmount * 1000),
      expenseK: d.totalAmount,
    }))
  }, [monthlyData])

  // Chart max values for scaling bars
  const maxSessions = useMemo(() => {
    return Math.max(...monthlyData.map((d) => d.sessionCount), 1)
  }, [monthlyData])

  const maxExpense = useMemo(() => {
    return Math.max(...monthlyData.map((d) => d.totalAmount), 1)
  }, [monthlyData])

  // 2. Total Club Expenses & Peak Month
  const totalClubExpense = useMemo(() => {
    return sessions.reduce((sum, session) => {
      const sSum = (session.entries || []).reduce((eSum, entry) => eSum + (Number(entry.amount) || 0), 0)
      return sum + sSum
    }, 0)
  }, [sessions])

  const peakMonth = useMemo(() => {
    if (monthlyData.length === 0) return null
    return [...monthlyData].sort((a, b) => b.sessionCount - a.sessionCount)[0]
  }, [monthlyData])

  // 3. Calculate Player Statistics (Spent share & Sessions count)
  const playerStats = useMemo(() => {
    const idToPlayer = Object.fromEntries(players.map((p) => [p.id, p]))
    const nameToPlayer = Object.fromEntries(players.map((p) => [p.name, p]))

    const statsMap = {}

    for (const p of players) {
      statsMap[p.name] = { player: p, name: p.name, totalSpent: 0, sessionCount: 0, sessionsSet: new Set() }
    }

    for (const session of sessions) {
      const sessionParticipants = new Set()

      for (const entry of session.entries || []) {
        if (!entry.people || entry.people.length === 0 || !entry.amount) continue
        const amounts = Array.isArray(entry.amounts) ? entry.amounts : []
        const shareCount = entry.people.length

        for (let i = 0; i < shareCount; i++) {
          const rawPerson = entry.people[i]
          const share = amounts.length === shareCount ? Number(amounts[i]) : entry.amount / shareCount
          if (!Number.isFinite(share) || share <= 0) continue

          let pName = ''
          let pObj = null
          if (rawPerson && typeof rawPerson === 'object') {
            pName = rawPerson.name || rawPerson.id
            pObj = idToPlayer[rawPerson.id] || nameToPlayer[pName]
          } else {
            pName = idToPlayer[rawPerson]?.name || String(rawPerson)
            pObj = idToPlayer[rawPerson] || nameToPlayer[pName]
          }

          if (!pName) continue

          if (!statsMap[pName]) {
            statsMap[pName] = { player: pObj || { id: pName, name: pName }, name: pName, totalSpent: 0, sessionCount: 0, sessionsSet: new Set() }
          }

          statsMap[pName].totalSpent += share
          sessionParticipants.add(pName)
        }
      }

      sessionParticipants.forEach((pName) => {
        if (statsMap[pName]) {
          statsMap[pName].sessionsSet.add(session.id)
        }
      })
    }

    const result = Object.values(statsMap).map((item) => ({
      ...item,
      sessionCount: item.sessionsSet.size,
    })).sort((a, b) => b.totalSpent - a.totalSpent)

    return result
  }, [sessions, players])

  const maxPlayerSpent = useMemo(() => {
    return Math.max(...playerStats.map((p) => p.totalSpent), 1)
  }, [playerStats])

  const filteredPlayerStats = useMemo(() => {
    return playerStats.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(playerSearchTerm.trim().toLowerCase())
      if (!matchesSearch) return false
      if (playerFilterPill === 'active' && p.totalSpent <= 0) return false
      return true
    })
  }, [playerStats, playerSearchTerm, playerFilterPill])

  const displayedPlayerStats = useMemo(() => {
    return filteredPlayerStats.slice(0, visiblePlayerCount)
  }, [filteredPlayerStats, visiblePlayerCount])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero Welcome Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.95) 0%, rgba(4, 120, 87, 0.9) 60%, rgba(15, 23, 42, 0.95) 100%)',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A7F3D0', marginBottom: 4 }}>
              🏆 BẢNG ĐIỀU KHIỂN CÂU LẠC BỘ CẦU LÔNG
            </div>
            <h2 style={{ fontFamily: 'var(--font-family-display)', fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Chào mừng đến với Smash Calculator!
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#E6F4EA' }}>
              Theo dõi phiên cầu, chi tiêu & phong độ vận động viên.
            </p>
          </div>
          <button className="btn btn-add" onClick={onNewSession} style={{ padding: '11px 20px', fontSize: '0.95rem' }}>
            <Plus size={18} /> Tạo phiên mới
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div className="card" style={{ padding: '18px 20px', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Phiên cầu</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>{sessions.length}</div>
              <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 600 }}>
                ~{monthlyData.filter(d => d.sessionCount > 0).length > 0 ? (sessions.length / monthlyData.filter(d => d.sessionCount > 0).length).toFixed(1) : 0} phiên/tháng
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Tổng kinh phí</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>
                {formatMoney(Math.round(totalClubExpense * 1000))}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600 }}>Toàn bộ câu lạc bộ</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Tay vợt</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>{players.length}</div>
              <div style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}>Thành viên câu lạc bộ</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FCE7F3', color: '#BE185D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Tháng sôi nổi nhất</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                {peakMonth && peakMonth.sessionCount > 0 ? formatFullMonth(peakMonth.monthKey) : '—'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#BE185D', fontWeight: 600 }}>
                {peakMonth && peakMonth.sessionCount > 0 ? `${peakMonth.sessionCount} phiên cầu` : 'Chưa có dữ liệu'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Statistics Bar & Line Progress Combo Chart using Recharts */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} style={{ color: '#16A34A' }} /> Biểu đồ Thống kê Tiến trình Phiên cầu & Chi tiêu theo Tháng
          </span>
          <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
            Biểu đồ kết hợp Recharts (Đường & Diện tích)
          </div>
        </div>

        {monthlyData.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có dữ liệu thống kê tháng nào.</p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 300, marginTop: 10 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={homeChartData} margin={{ top: 15, right: 15, left: 5, bottom: 15 }}>
                <defs>
                  <linearGradient id="homeExpenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}M` : val > 0 ? `${Math.round(val)}k` : '0')}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#EA580C"
                  fontSize={11}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <Tooltip content={<HomePageChartTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.8rem' }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="expenseK"
                  name="Kinh phí (k VND)"
                  fill="url(#homeExpenseAreaGrad)"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                />
                <Bar
                  yAxisId="left"
                  dataKey="expenseK"
                  name="Cột Kinh phí"
                  fill="#22C55E"
                  opacity={0.3}
                  barSize={18}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sessions"
                  name="Số phiên cầu"
                  stroke="#EA580C"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#F97316', stroke: '#FFFFFF', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#EA580C' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Per-Player Spending & Attendance Breakdown */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} style={{ color: '#16A34A' }} /> Thống kê Chi tiêu & Tần suất của từng Tay vợt
          </span>
          {onNavigateTab && (
            <button className="btn btn-outline btn-sm" onClick={() => onNavigateTab('stats')}>
              Xem chi tiết bảng xếp hạng <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm tay vợt..."
              value={playerSearchTerm}
              onChange={(e) => {
                setPlayerSearchTerm(e.target.value)
                setVisiblePlayerCount(5)
              }}
              style={{
                paddingLeft: 32,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                fontSize: '0.84rem',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setPlayerFilterPill('all'); setVisiblePlayerCount(5) }}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 700,
                border: playerFilterPill === 'all' ? '1.5px solid #16A34A' : '1px solid #CBD5E1',
                background: playerFilterPill === 'all' ? '#F0FDF4' : '#FFFFFF',
                color: playerFilterPill === 'all' ? '#15803D' : '#64748B',
                cursor: 'pointer',
              }}
            >
              Tất cả ({playerStats.length})
            </button>
            <button
              type="button"
              onClick={() => { setPlayerFilterPill('active'); setVisiblePlayerCount(5) }}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 700,
                border: playerFilterPill === 'active' ? '1.5px solid #16A34A' : '1px solid #CBD5E1',
                background: playerFilterPill === 'active' ? '#F0FDF4' : '#FFFFFF',
                color: playerFilterPill === 'active' ? '#15803D' : '#64748B',
                cursor: 'pointer',
              }}
            >
              Có chi tiêu ({playerStats.filter(p => p.totalSpent > 0).length})
            </button>
          </div>
        </div>

        {displayedPlayerStats.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <p>Không tìm thấy tay vợt phù hợp.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayedPlayerStats.map((item, idx) => {
                const percentage = Math.round((item.totalSpent / maxPlayerSpent) * 100)
                return (
                  <div key={item.name} style={{
                    padding: '12px 16px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#64748B', width: 22 }}>
                          {idx + 1}.
                        </span>
                        <PlayerAvatar player={item.player} size={36} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>{item.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B' }}>🏸 {item.sessionCount} phiên tham gia</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#16A34A' }}>
                          {formatMoney(Math.round(item.totalSpent * 1000))}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Phần chi phí chia lẻ</div>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div style={{ width: '100%', height: 6, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #22C55E 0%, #16A34A 100%)',
                        borderRadius: 999,
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Lazy Load / Load More Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              {filteredPlayerStats.length > visiblePlayerCount && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setVisiblePlayerCount((prev) => prev + 5)}
                  style={{ fontSize: '0.84rem', padding: '7px 16px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ChevronDown size={16} /> Xem thêm 5 tay vợt (Còn {filteredPlayerStats.length - visiblePlayerCount})
                </button>
              )}
              {visiblePlayerCount > 5 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setVisiblePlayerCount(5)}
                  style={{ fontSize: '0.84rem', padding: '7px 16px', borderRadius: 999, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ChevronUp size={16} /> Thu gọn (Top 5)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
