import { useMemo } from 'react'
import { sortPlayerNames } from '../constants'

function formatPlayers(value) {
  if (Array.isArray(value)) {
    return sortPlayerNames(value).join(', ')
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return '-'
}

function getMatchValue(session, keys) {
  for (const key of keys) {
    const value = session?.[key]
    if (Array.isArray(value) && value.length) return value
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export default function MatchHistoryPage({ sessions, onViewSession }) {
  const matchRows = useMemo(() => {
    return [...sessions]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .map((session) => ({
        session,
        teamA: getMatchValue(session, ['pheA', 'teamA', 'sideA', 'playersA', 'a']),
        teamB: getMatchValue(session, ['pheB', 'teamB', 'sideB', 'playersB', 'b']),
        winner: getMatchValue(session, ['pheThang', 'winner', 'winningTeam', 'result']),
      }))
  }, [sessions])

  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: 'space-between' }}>
        <span>🏆 Lịch sử thi đấu (Under development)</span>
      </div>

      <div className="table-wrap">
        <table className="result-table history-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>Phe A</th>
              <th style={{ textAlign: 'center' }}>Phe B</th>
              <th style={{ textAlign: 'center' }}>Phe thắng</th>
              <th style={{ textAlign: 'center' }}>Phiên cầu</th>
            </tr>
          </thead>
          <tbody>
            {matchRows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Chưa có dữ liệu lịch sử thi đấu.
                </td>
              </tr>
            ) : (
              matchRows.map(({ session, teamA, teamB, winner }) => (
                <tr key={session.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatPlayers(teamA)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatPlayers(teamB)}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: winner ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {formatPlayers(winner)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => onViewSession?.(session)}
                    >
                      Mở phiên
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}