import { formatMoney, calculateTotals, getEntryLabel } from '../constants'

export default function SessionHistory({ sessions, expenseTypes, onNewSession, onView, onDelete }) {
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={onNewSession} style={{ width: '100%' }}>
          ➕ Phiên đánh mới
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <p style={{ fontSize: '2rem', marginBottom: '8px' }}>🏸</p>
            <p>Chưa có phiên đánh nào.</p>
            <p>Bấm "Phiên đánh mới" để bắt đầu!</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">📜 Lịch sử ({sessions.length} phiên)</div>
          <div className="table-wrap">
            <table className="result-table history-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Người</th>
                  <th>Chi tiết</th>
                  <th>Tổng</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const totals = calculateTotals(session.entries)
                  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
                  const playerCount = new Set(session.entries.flatMap((e) => e.people)).size

                  const formattedDate = new Date(session.date).toLocaleDateString('vi-VN', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })

                  const details = session.entries.map((e) => getEntryLabel(e, expenseTypes)).join(', ')

                  return (
                    <tr
                      key={session.id}
                      className="history-row"
                      onClick={() => onView(session)}
                    >
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{formattedDate}</td>
                      <td>{playerCount}</td>
                      <td>
                        <span className="history-details">{details}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {formatMoney(Math.round(grandTotal * 1000))}
                      </td>
                      <td>
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
