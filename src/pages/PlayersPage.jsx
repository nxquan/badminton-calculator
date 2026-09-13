import { useState, useMemo } from 'react'
import { Users, Search, Plus, Pencil, Trash2, ArrowUpDown, Trophy, Activity } from 'lucide-react'
import PlayerAvatar from '../components/PlayerAvatar'

export default function PlayersPage({ 
  players = [],
  onAddClick, 
  onEditClick, 
  onDeleteClick,
  playerStats = {},
  sessions = [],
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name-asc') // 'name-asc', 'name-desc', 'games-desc', 'avg-desc'
  const [filterActivity, setFilterActivity] = useState('all') // 'all', 'active', 'inactive'

  // Map players used in sessions
  const { usedPlayerIds, usedPlayerNames } = useMemo(() => {
    const ids = new Set()
    const names = new Set()
    for (const s of sessions || []) {
      for (const e of s.entries || []) {
        if (e.payer) {
          if (typeof e.payer === 'string') {
            ids.add(e.payer)
            names.add(e.payer.toLowerCase())
          } else if (e.payer.id || e.payer.name) {
            if (e.payer.id) ids.add(String(e.payer.id))
            if (e.payer.name) names.add(String(e.payer.name).toLowerCase())
          }
        }
        for (const person of e.people || []) {
          if (typeof person === 'string') {
            ids.add(person)
            names.add(person.toLowerCase())
          } else if (person && (person.id || person.name)) {
            if (person.id) ids.add(String(person.id))
            if (person.name) names.add(String(person.name).toLowerCase())
          }
        }
      }
    }
    return { usedPlayerIds: ids, usedPlayerNames: names }
  }, [sessions])

  // Filter and sort players
  const processedPlayers = useMemo(() => {
    let result = [...players]

    // 1. Search term filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      result = result.filter((p) => String(p.name || '').toLowerCase().includes(term))
    }

    // 2. Activity filter
    if (filterActivity === 'active') {
      result = result.filter((p) => (playerStats?.[p.name]?.total || 0) > 0)
    } else if (filterActivity === 'inactive') {
      result = result.filter((p) => (playerStats?.[p.name]?.total || 0) === 0)
    }

    // 3. Sorting
    result.sort((a, b) => {
      const statsA = playerStats?.[a.name] || {}
      const statsB = playerStats?.[b.name] || {}
      const totalA = statsA.total || 0
      const totalB = statsB.total || 0
      const avgA = statsA.avgPerMonth || 0
      const avgB = statsB.avgPerMonth || 0

      if (sortBy === 'games-desc') {
        if (totalB !== totalA) return totalB - totalA
        return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' })
      }
      if (sortBy === 'avg-desc') {
        if (avgB !== avgA) return avgB - avgA
        return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' })
      }
      if (sortBy === 'name-desc') {
        return String(b.name || '').localeCompare(String(a.name || ''), 'vi', { sensitivity: 'base' })
      }
      // Default: 'name-asc' (Alphabetical Vietnamese order)
      return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' })
    })

    return result
  }, [players, playerStats, searchTerm, sortBy, filterActivity])

  // Count active vs inactive
  const activeCount = useMemo(() => players.filter((p) => (playerStats?.[p.name]?.total || 0) > 0).length, [players, playerStats])
  const inactiveCount = players.length - activeCount

  return (
    <div className="card">
      {/* Title & Primary Action */}
      <div className="card-title" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Users size={22} style={{ color: '#16A34A' }} /> Danh sách Vận động viên ({players.length})
        </span>
        <button className="btn btn-add" onClick={onAddClick}>
          <Plus size={18} /> Thêm tay vợt
        </button>
      </div>

      {/* Toolbar: Search, Sort & Activity Filter */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#F8FAFC',
        padding: '12px 16px',
        borderRadius: 'var(--radius)',
        border: '1px solid #E2E8F0',
        marginBottom: 16
      }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px', minWidth: 200, background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: 'var(--radius)', padding: '6px 12px' }}>
          <Search size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên tay vợt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, outline: 'none', fontSize: '0.88rem', width: '100%', color: '#0F172A' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Activity Status Filter Pills */}
          <div style={{ display: 'flex', gap: 4, background: '#FFFFFF', padding: 3, border: '1px solid #CBD5E1', borderRadius: 'var(--radius)' }}>
            <button
              type="button"
              onClick={() => setFilterActivity('all')}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: filterActivity === 'all' ? '#16A34A' : 'transparent',
                color: filterActivity === 'all' ? '#FFFFFF' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              Tất cả ({players.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterActivity('active')}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: filterActivity === 'active' ? '#16A34A' : 'transparent',
                color: filterActivity === 'active' ? '#FFFFFF' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              Thường xuyên ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterActivity('inactive')}
              style={{
                border: 'none',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: filterActivity === 'inactive' ? '#16A34A' : 'transparent',
                color: filterActivity === 'inactive' ? '#FFFFFF' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              Chưa đấu ({inactiveCount})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpDown size={15} style={{ color: '#64748B' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ minWidth: 160, padding: '6px 10px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <option value="name-asc">🔤 Tên A ➔ Z</option>
              <option value="name-desc">🔤 Tên Z ➔ A</option>
              <option value="games-desc">🏸 Số trận nhiều nhất</option>
              <option value="avg-desc">📈 Tần suất /tháng cao nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players List Grid */}
      <div style={{ padding: '4px 0' }}>
        {players.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có tay vợt nào trong danh sách câu lạc bộ.</p>
          </div>
        ) : processedPlayers.length === 0 ? (
          <div className="empty-state">
            <p>Không tìm thấy vận động viên nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
            {processedPlayers.map((p, idx) => {
              const stats = playerStats?.[p.name] || {}
              const totalGames = stats.total || 0
              const avgMonth = stats.avgPerMonth ?? 0
              const isActive = totalGames > 0

              // Determine if player has participated in any session
              const isUsedInSessions = totalGames > 0 || usedPlayerIds.has(p.id) || usedPlayerNames.has(String(p.name || '').toLowerCase())

              // Top 3 badges when sorted by games
              const isTopRanked = sortBy === 'games-desc' && idx < 3 && totalGames > 0

              return (
                <div key={p.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  background: isTopRanked ? '#F0FDF4' : '#FFFFFF',
                  border: isTopRanked ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}>
                  <PlayerAvatar player={p} size={46} />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </span>
                      {isTopRanked && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: idx === 0 ? '#FEF3C7' : idx === 1 ? '#F1F5F9' : '#FFEDD5',
                          color: idx === 0 ? '#B45309' : idx === 1 ? '#475569' : '#C2410C',
                          border: '1px solid currentColor',
                          flexShrink: 0
                        }}>
                          {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : '🥉 #3'}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: '0.78rem', color: '#64748B' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: isActive ? 700 : 500, color: isActive ? '#15803D' : '#94A3B8' }}>
                        <Activity size={13} /> {totalGames} trận
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        📈 {avgMonth}/tháng
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-outline btn-sm" title="Sửa thông tin" onClick={() => onEditClick(p)}>
                      <Pencil size={13} />
                    </button>
                    {!isUsedInSessions && (
                      <button className="btn btn-danger-soft btn-sm" title="Xóa tay vợt" onClick={() => {
                        if (confirm(`Xóa vận động viên "${p.name}"?`)) onDeleteClick(p)
                      }}>
                        <Trash2 size={13} />
                      </button>
                    )}
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

