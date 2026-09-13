import { useMemo } from 'react'
import { Plus, Calendar, Wallet, Users, Flame, BarChart3, ArrowRight } from 'lucide-react'
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

export default function HomePage({ sessions = [], players = [], expenseTypes = [], onNewSession, onViewSession, onNavigateTab }) {
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
            <h2 style={{ fontFamily: 'var(--font-family-display)', fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Chào mừng đến với Smash Calculator!
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#E6F4EA' }}>
              Theo dõi tổng quan các phiên cầu, thống kê biểu đồ chi tiêu và phong độ vận động viên.
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

      {/* Monthly Statistics Bar & Line Progress Combo Chart */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} style={{ color: '#16A34A' }} /> Biểu đồ Thống kê Tiến trình Phiên cầu & Chi tiêu theo Tháng
          </span>
          <div style={{ display: 'flex', gap: 14, fontSize: '0.82rem', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#F97316', display: 'inline-block' }} /> Số phiên (Cột & Đường trend)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#16A34A', display: 'inline-block' }} /> Kinh phí (VND)
            </span>
          </div>
        </div>

        {monthlyData.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có dữ liệu thống kê tháng nào.</p>
          </div>
        ) : (
          <div style={{ padding: '16px 0 0 0', position: 'relative' }}>
            <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
              <div style={{ position: 'relative', minWidth: Math.max(monthlyData.length * 64, 500), height: 230 }}>
                
                {/* SVG Progress Trend Line Overlay */}
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: 180,
                    pointerEvents: 'none',
                    zIndex: 5
                  }}
                >
                  {/* Polyline path for Session Count Progress Trend */}
                  {(() => {
                    const totalItems = monthlyData.length
                    if (totalItems < 1) return null

                    const points = monthlyData.map((d, idx) => {
                      const itemWidth = 100 / totalItems
                      const cx = (idx + 0.5) * itemWidth
                      // Height range: top 20 to 170
                      const cy = 170 - (d.sessionCount / maxSessions) * 140
                      return { x: cx, y: cy, d }
                    })

                    const svgPoints = points.map((p) => `${p.x}% ${p.y}px`).join(', ')

                    return (
                      <>
                        {/* Progress line */}
                        <polyline
                          fill="none"
                          stroke="#EA580C"
                          strokeWidth="3"
                          strokeDasharray="4 2"
                          points={points.map((p) => `${(p.d ? (points.indexOf(p) + 0.5) * (100 / totalItems) : 0)}% ${p.y}`).join(' ')}
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(234, 88, 12, 0.4))' }}
                        />
                        {/* Dots on line */}
                        {points.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={`${p.x}%`}
                            cy={p.y}
                            r={p.d.sessionCount > 0 ? "5" : "3"}
                            fill={p.d.sessionCount > 0 ? "#F97316" : "#CBD5E1"}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                        ))}
                      </>
                    )
                  })()}
                </svg>

                {/* Bars & Labels */}
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 180, borderBottom: '2px solid #E2E8F0', paddingBottom: 4 }}>
                  {monthlyData.map((d) => {
                    const sessionBarHeight = d.sessionCount > 0 ? Math.max(Math.round((d.sessionCount / maxSessions) * 140), 12) : 4
                    const expenseBarHeight = d.totalAmount > 0 ? Math.max(Math.round((d.totalAmount / maxExpense) * 140), 12) : 4
                    return (
                      <div key={d.monthKey} style={{ flex: 1, minWidth: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 140 }}>
                          {/* Session count bar */}
                          <div
                            title={`${formatFullMonth(d.monthKey)}: ${d.sessionCount} phiên cầu`}
                            style={{
                              width: 16,
                              height: `${sessionBarHeight}px`,
                              background: d.sessionCount > 0 ? 'linear-gradient(180deg, #FB923C 0%, #F97316 100%)' : '#E2E8F0',
                              borderRadius: '3px 3px 0 0',
                              transition: 'height 0.3s ease',
                              opacity: d.sessionCount > 0 ? 0.9 : 0.4
                            }}
                          />
                          {/* Expense bar */}
                          <div
                            title={`${formatFullMonth(d.monthKey)}: ${formatMoney(Math.round(d.totalAmount * 1000))}`}
                            style={{
                              width: 16,
                              height: `${expenseBarHeight}px`,
                              background: d.totalAmount > 0 ? 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)' : '#CBD5E1',
                              borderRadius: '3px 3px 0 0',
                              transition: 'height 0.3s ease',
                              opacity: d.totalAmount > 0 ? 0.9 : 0.4
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: d.sessionCount > 0 ? '#0F172A' : '#94A3B8', textAlign: 'center', marginTop: 8 }}>
                          {formatMonthTitle(d.monthKey)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-Player Spending & Attendance Breakdown */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} style={{ color: '#16A34A' }} /> Thống kê Chi tiêu & Tần suất của từng Tay vợt
          </span>
          {onNavigateTab && (
            <button className="btn btn-outline btn-sm" onClick={() => onNavigateTab('stats')}>
              Xem chi tiết bảng xếp hạng <ArrowRight size={14} />
            </button>
          )}
        </div>

        {playerStats.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có dữ liệu thành viên.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {playerStats.map((item, idx) => {
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
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#64748B', width: 20 }}>
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
        )}
      </div>
    </div>
  )
}
